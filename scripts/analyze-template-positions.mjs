/**
 * Analyze the template PDF to find QR code and URL positions
 * This will help us understand where to replace content
 */

import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeTemplate() {
  const pdfPath = path.join(__dirname, '..', 'uploads', '60x60 Stickers_DO NOT MODIFY.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  console.log('=== Template PDF Analysis for Modification ===\n');
  
  // Use pdf-lib to load and analyze
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const page = pages[0];
  
  const { width, height } = page.getSize();
  console.log(`Page dimensions: ${width} x ${height} pts`);
  console.log(`Page dimensions: ${(width / 72 * 25.4).toFixed(2)} x ${(height / 72 * 25.4).toFixed(2)} mm\n`);
  
  // Use pdfjs to get text positions
  const data = new Uint8Array(pdfBuffer);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pdfPage = await pdf.getPage(1);
  
  // Get text content
  const textContent = await pdfPage.getTextContent();
  
  console.log('=== Text Content ===\n');
  
  // Find unique text items
  const textItems = textContent.items.filter(item => item.str && item.str.trim());
  
  // Group by unique text
  const uniqueTexts = new Map();
  textItems.forEach(item => {
    const text = item.str.trim();
    if (!uniqueTexts.has(text)) {
      uniqueTexts.set(text, []);
    }
    uniqueTexts.get(text).push({
      x: item.transform[4],
      y: item.transform[5],
      xMm: (item.transform[4] / 72 * 25.4).toFixed(2),
      yMm: (item.transform[5] / 72 * 25.4).toFixed(2),
      yFromTop: ((height - item.transform[5]) / 72 * 25.4).toFixed(2),
      fontSize: Math.abs(item.transform[0])
    });
  });
  
  console.log(`Found ${uniqueTexts.size} unique text strings:\n`);
  
  uniqueTexts.forEach((positions, text) => {
    console.log(`"${text}" - appears ${positions.length} times`);
    if (positions.length <= 12) {
      positions.forEach((pos, i) => {
        console.log(`  ${i + 1}. X=${pos.xMm}mm, Y from top=${pos.yFromTop}mm, font=${pos.fontSize.toFixed(1)}pt`);
      });
    }
    console.log('');
  });
  
  // Look specifically for URL patterns
  console.log('=== URL Patterns ===\n');
  const urlPattern = /www\.|\.bz|\.com|epay|moruya/i;
  
  textItems.filter(item => urlPattern.test(item.str)).forEach(item => {
    const yFromTop = (height - item.transform[5]) / 72 * 25.4;
    console.log(`"${item.str}" at X=${(item.transform[4] / 72 * 25.4).toFixed(2)}mm, Y from top=${yFromTop.toFixed(2)}mm`);
  });
  
  // Analyze images
  console.log('\n=== Image Analysis ===\n');
  
  const opList = await pdfPage.getOperatorList();
  
  // Find image transforms (these contain position and size info)
  const imageTransforms = [];
  let currentTransform = null;
  
  for (let i = 0; i < opList.fnArray.length; i++) {
    const op = opList.fnArray[i];
    const args = opList.argsArray[i];
    
    // transform operator
    if (op === pdfjsLib.OPS.transform) {
      currentTransform = args;
    }
    
    // paintImageXObject
    if (op === pdfjsLib.OPS.paintImageXObject && currentTransform) {
      const [scaleX, skewX, skewY, scaleY, translateX, translateY] = currentTransform;
      
      // Convert to mm
      const widthMm = (Math.abs(scaleX) / 72 * 25.4).toFixed(2);
      const heightMm = (Math.abs(scaleY) / 72 * 25.4).toFixed(2);
      const xMm = (translateX / 72 * 25.4).toFixed(2);
      const yFromBottomMm = (translateY / 72 * 25.4).toFixed(2);
      const yFromTopMm = ((height - translateY - Math.abs(scaleY)) / 72 * 25.4).toFixed(2);
      
      imageTransforms.push({
        imageName: args[0],
        width: widthMm,
        height: heightMm,
        x: xMm,
        yFromBottom: yFromBottomMm,
        yFromTop: yFromTopMm,
        rawTransform: currentTransform
      });
    }
  }
  
  console.log(`Found ${imageTransforms.length} images:\n`);
  
  // Group by image name
  const imagesByName = new Map();
  imageTransforms.forEach(img => {
    if (!imagesByName.has(img.imageName)) {
      imagesByName.set(img.imageName, []);
    }
    imagesByName.get(img.imageName).push(img);
  });
  
  imagesByName.forEach((images, name) => {
    console.log(`Image "${name}" - ${images.length} instances:`);
    images.forEach((img, i) => {
      console.log(`  ${i + 1}. Size: ${img.width}x${img.height}mm, Position: X=${img.x}mm, Y from top=${img.yFromTop}mm`);
    });
    console.log('');
  });
  
  // Check for embedded resources
  console.log('\n=== PDF Resources ===\n');
  
  const pageDict = page.node;
  console.log('Page has Resources:', pageDict.has(pdfDoc.context.obj('Resources')));
}

analyzeTemplate().catch(console.error);
