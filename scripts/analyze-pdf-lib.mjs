/**
 * Analyze PDF template using pdf-lib
 * Run with: node scripts/analyze-pdf-lib.mjs
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzePdf() {
  const pdfPath = path.join(__dirname, '..', 'uploads', '60x60 Stickers_DO NOT MODIFY.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  console.log('=== PDF Template Analysis ===\n');
  
  // Page info
  const pages = pdfDoc.getPages();
  console.log(`Total pages: ${pages.length}`);
  
  const page = pages[0];
  const { width, height } = page.getSize();
  
  console.log(`\nPage dimensions:`);
  console.log(`  Width: ${width} pts = ${(width / 72 * 25.4).toFixed(2)} mm`);
  console.log(`  Height: ${height} pts = ${(height / 72 * 25.4).toFixed(2)} mm`);
  
  // Get all embedded fonts
  const fonts = pdfDoc.catalog.get(pdfDoc.catalog.lookup(pdfDoc.context.trailerInfo.Root).get(pdfDoc.context.obj('Pages')));
  
  // Document info
  console.log(`\nDocument info:`);
  console.log(`  Title: ${pdfDoc.getTitle() || 'N/A'}`);
  console.log(`  Author: ${pdfDoc.getAuthor() || 'N/A'}`);
  console.log(`  Subject: ${pdfDoc.getSubject() || 'N/A'}`);
  console.log(`  Creator: ${pdfDoc.getCreator() || 'N/A'}`);
  console.log(`  Producer: ${pdfDoc.getProducer() || 'N/A'}`);
  
  // Count forms/annotations
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  console.log(`\nForm fields: ${fields.length}`);
  
  // Get page content operators
  const contentStream = page.node.Contents();
  if (contentStream) {
    console.log(`\nPage has content stream`);
  }
  
  // Analysis based on typical 60x60mm sticker layout
  // A4 = 210mm x 297mm
  // 60x60mm stickers in 3x4 grid
  // Margins and spacing calculation
  
  const a4Width = 210; // mm
  const a4Height = 297; // mm
  const stickerSize = 60; // mm
  const cols = 3;
  const rows = 4;
  
  // Calculate spacing
  const totalStickerWidth = cols * stickerSize; // 180mm
  const totalStickerHeight = rows * stickerSize; // 240mm
  const horizontalMargin = (a4Width - totalStickerWidth) / 2; // 15mm each side
  const verticalMargin = (a4Height - totalStickerHeight) / 2; // 28.5mm top and bottom
  
  console.log(`\n=== Calculated Layout (60x60mm stickers) ===`);
  console.log(`Sticker size: ${stickerSize}mm x ${stickerSize}mm`);
  console.log(`Grid: ${cols} columns x ${rows} rows = ${cols * rows} stickers`);
  console.log(`Horizontal margin: ${horizontalMargin}mm`);
  console.log(`Vertical margin: ${verticalMargin}mm`);
  
  // QR code position within each sticker cell
  // Assuming QR code is centered with text below
  const qrSize = 50; // mm - QR code is typically smaller than cell to leave room for text
  const qrTopMargin = 2; // mm from top of cell
  const textHeight = 8; // mm - space for text at bottom
  
  console.log(`\n=== Cell Layout ===`);
  console.log(`QR code size: ${qrSize}mm x ${qrSize}mm`);
  console.log(`QR top margin within cell: ${qrTopMargin}mm`);
  console.log(`Text area height: ${textHeight}mm`);
  
  // Calculate positions for each sticker
  console.log(`\n=== Sticker Positions (from top-left) ===`);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = horizontalMargin + col * stickerSize;
      const y = verticalMargin + row * stickerSize;
      const cellNum = row * cols + col + 1;
      console.log(`Cell ${cellNum}: (${x}mm, ${y}mm)`);
    }
  }
  
  // Convert to points for PDF
  const mmToPoints = (mm) => mm * 72 / 25.4;
  
  console.log(`\n=== Sticker Positions (in points, from bottom-left for PDF) ===`);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const xMm = horizontalMargin + col * stickerSize;
      // PDF coordinates start from bottom-left
      const yMm = a4Height - verticalMargin - (row + 1) * stickerSize;
      const cellNum = row * cols + col + 1;
      console.log(`Cell ${cellNum}: (${mmToPoints(xMm).toFixed(2)} pts, ${mmToPoints(yMm).toFixed(2)} pts)`);
    }
  }
}

analyzePdf().catch(console.error);
