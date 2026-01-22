import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

// Validate URL format
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Fetch QR image and extract display text from 'data' parameter
async function fetchQRImage(imageUrl: string): Promise<{ imageBuffer: Buffer; displayText: string }> {
  let displayText = '';
  try {
    displayText = new URL(imageUrl).searchParams.get('data') || '';
  } catch {
    displayText = '';
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch QR image: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('image')) {
    throw new Error(`URL did not return an image. Content-Type: ${contentType}`);
  }

  return {
    imageBuffer: Buffer.from(await response.arrayBuffer()),
    displayText,
  };
}

// Parse base64 image data
function parseBase64Image(base64String: string): { buffer: Buffer; mimeType: string } {
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image format');
  }
  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], 'base64'),
  };
}

// Template configuration - sticker positions on A4 sheet
const TEMPLATE_CONFIG = {
  qrCodePositions: [
    { x: 45.58, y: 36.09 }, { x: 113.03, y: 35.98 }, { x: 179.44, y: 35.98 },
    { x: 45.56, y: 103.10 }, { x: 112.62, y: 103.08 }, { x: 179.28, y: 103.21 },
    { x: 45.30, y: 170.23 }, { x: 112.34, y: 170.22 }, { x: 179.00, y: 170.34 },
    { x: 45.28, y: 237.00 }, { x: 112.32, y: 236.98 }, { x: 178.98, y: 237.10 },
  ],
  qrCodeSize: 14.43,
  urlPositions: [
    { x: 22.11, y: 66.99 }, { x: 89.02, y: 67.07 }, { x: 156.10, y: 66.99 },
    { x: 21.85, y: 134.15 }, { x: 88.68, y: 134.15 }, { x: 155.68, y: 134.15 },
    { x: 21.60, y: 201.23 }, { x: 88.43, y: 201.23 }, { x: 155.59, y: 201.23 },
    { x: 21.85, y: 268.13 }, { x: 88.17, y: 268.30 }, { x: 155.17, y: 268.47 },
  ],
};

const mmToPt = (mm: number) => mm * 72 / 25.4;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrImageUrl, qrImageBase64, labelText } = body;

    let imageBuffer: Buffer;
    let displayText: string;
    let mimeType = 'image/png';

    // Handle URL-based input
    if (qrImageUrl) {
      if (!validateUrl(qrImageUrl)) {
        return NextResponse.json({ error: 'Invalid QR image URL' }, { status: 400 });
      }
      const result = await fetchQRImage(qrImageUrl);
      imageBuffer = result.imageBuffer;
      // Use labelText if provided (for website URLs), otherwise use extracted displayText
      displayText = labelText || result.displayText;
    }
    // Handle base64 image upload
    else if (qrImageBase64) {
      const parsed = parseBase64Image(qrImageBase64);
      imageBuffer = parsed.buffer;
      mimeType = parsed.mimeType;
      displayText = labelText || '';
    }
    // No valid input
    else {
      return NextResponse.json({ error: 'Please provide a QR image URL or upload an image' }, { status: 400 });
    }

    // Load template PDF
    const templatePath = path.join(process.cwd(), 'uploads', 'template.pdf');
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Template PDF not found' }, { status: 500 });
    }

    const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath), { ignoreEncryption: true });
    const page = pdfDoc.getPages()[0];
    const { height } = page.getSize();

    // Embed QR image (handle both PNG and JPG)
    let qrImage;
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      qrImage = await pdfDoc.embedJpg(imageBuffer);
    } else {
      qrImage = await pdfDoc.embedPng(imageBuffer);
    }
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const qrSizePt = mmToPt(TEMPLATE_CONFIG.qrCodeSize);

    // Place QR codes
    for (const pos of TEMPLATE_CONFIG.qrCodePositions) {
      const xPt = mmToPt(pos.x);
      const yPt = height - mmToPt(pos.y) - qrSizePt;

      page.drawRectangle({ x: xPt, y: yPt, width: qrSizePt, height: qrSizePt, color: rgb(1, 1, 1) });
      page.drawImage(qrImage, { x: xPt, y: yPt, width: qrSizePt, height: qrSizePt });
    }

    // Calculate font size to fit text
    const cardWidth = mmToPt(63);
    const maxTextWidth = mmToPt(46);
    let fontSize = 9;
    let textWidth = boldFont.widthOfTextAtSize(displayText, fontSize);
    while (textWidth > maxTextWidth && fontSize > 5) {
      fontSize -= 0.5;
      textWidth = boldFont.widthOfTextAtSize(displayText, fontSize);
    }

    // Place URL text centered on each sticker
    const cardLeftEdges = [mmToPt(8), mmToPt(75), mmToPt(142)];
    for (let i = 0; i < TEMPLATE_CONFIG.urlPositions.length; i++) {
      const pos = TEMPLATE_CONFIG.urlPositions[i];
      const cardCenterX = cardLeftEdges[i % 3] + cardWidth / 2;
      const centeredX = cardCenterX - textWidth / 2;
      const yPt = height - mmToPt(pos.y) - fontSize * 0.3;

      page.drawText(displayText, { x: centeredX, y: yPt, size: fontSize, font: boldFont, color: rgb(0, 0, 0) });
    }

    const pdfBytes = await pdfDoc.save();
    const filename = `stickers-${displayText.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 30)}.pdf`;

    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Sticker generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate sticker sheet' },
      { status: 500 }
    );
  }
}
