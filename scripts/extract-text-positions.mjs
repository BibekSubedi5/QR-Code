/**
 * Extract text positions from PDF using pdfjs-dist
 * Run with: node scripts/extract-text-positions.mjs
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractTextPositions() {
  const pdfPath = path.join(__dirname, '..', 'uploads', '60x60 Stickers_DO NOT MODIFY.pdf');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  console.log(`=== PDF Text Position Analysis ===\n`);
  console.log(`Total pages: ${pdf.numPages}\n`);
  
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  
  console.log(`Page viewport:`);
  console.log(`  Width: ${viewport.width} pts = ${(viewport.width / 72 * 25.4).toFixed(2)} mm`);
  console.log(`  Height: ${viewport.height} pts = ${(viewport.height / 72 * 25.4).toFixed(2)} mm\n`);
  
  // Get text content with positions
  const textContent = await page.getTextContent();
  
  console.log(`=== Text Items Found: ${textContent.items.length} ===\n`);
  
  const textItems = [];
  
  textContent.items.forEach((item, index) => {
    if (item.str && item.str.trim()) {
      const transform = item.transform;
      // transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const x = transform[4];
      const y = transform[5];
      const fontSize = Math.abs(transform[0]) || Math.abs(transform[3]);
      
      textItems.push({
        text: item.str,
        x: x,
        y: y,
        xMm: (x / 72 * 25.4).toFixed(2),
        yMm: (y / 72 * 25.4).toFixed(2),
        fontSize: fontSize.toFixed(1),
        width: item.width,
        height: item.height
      });
      
      console.log(`${index + 1}. "${item.str}"`);
      console.log(`   Position: (${x.toFixed(2)}, ${y.toFixed(2)}) pts`);
      console.log(`   Position: (${(x / 72 * 25.4).toFixed(2)}, ${(y / 72 * 25.4).toFixed(2)}) mm`);
      console.log(`   Y from top: ${((viewport.height - y) / 72 * 25.4).toFixed(2)} mm`);
      console.log(`   Font size: ~${fontSize.toFixed(1)} pts`);
      console.log(`   Dimensions: ${item.width?.toFixed(2) || 'N/A'} x ${item.height?.toFixed(2) || 'N/A'}`);
      console.log('');
    }
  });
  
  // Analyze grid pattern
  console.log(`\n=== Grid Analysis ===\n`);
  
  // Sort by Y position (top to bottom in PDF coords means higher Y first)
  const sortedByY = [...textItems].sort((a, b) => b.y - a.y);
  
  // Group by rows (Y position)
  const yPositions = [...new Set(sortedByY.map(item => Math.round(item.y)))];
  console.log(`Unique Y positions (rows): ${yPositions.length}`);
  yPositions.forEach(y => {
    const rowItems = textItems.filter(item => Math.abs(item.y - y) < 5);
    console.log(`  Y=${y} (${(y / 72 * 25.4).toFixed(2)}mm from bottom, ${((viewport.height - y) / 72 * 25.4).toFixed(2)}mm from top): ${rowItems.map(i => `"${i.text}"`).join(', ')}`);
  });
  
  // Get X positions
  const xPositions = [...new Set(textItems.map(item => Math.round(item.x)))];
  console.log(`\nUnique X positions (columns): ${xPositions.length}`);
  xPositions.sort((a, b) => a - b).forEach(x => {
    const colItems = textItems.filter(item => Math.abs(item.x - x) < 5);
    console.log(`  X=${x} (${(x / 72 * 25.4).toFixed(2)}mm from left): ${colItems.map(i => `"${i.text}"`).join(', ')}`);
  });
  
  // Calculate cell dimensions
  if (xPositions.length >= 2) {
    const sortedX = xPositions.sort((a, b) => a - b);
    const cellWidth = sortedX[1] - sortedX[0];
    console.log(`\nEstimated cell width: ${cellWidth.toFixed(2)} pts = ${(cellWidth / 72 * 25.4).toFixed(2)} mm`);
  }
  
  if (yPositions.length >= 2) {
    const sortedY = yPositions.sort((a, b) => b - a);
    const cellHeight = sortedY[0] - sortedY[1];
    console.log(`Estimated cell height: ${cellHeight.toFixed(2)} pts = ${(cellHeight / 72 * 25.4).toFixed(2)} mm`);
  }
  
  // Get operator list for images
  const opList = await page.getOperatorList();
  console.log(`\n=== Operator List Analysis ===`);
  console.log(`Total operators: ${opList.fnArray.length}`);
  
  // Count image operators
  const imageOps = opList.fnArray.filter(op => op === pdfjsLib.OPS.paintImageXObject || op === pdfjsLib.OPS.paintJpegXObject);
  console.log(`Image paint operations: ${imageOps.length}`);
}

extractTextPositions().catch(console.error);
