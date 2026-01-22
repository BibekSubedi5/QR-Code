/**
 * Script to analyze the PDF template structure
 * Run with: node scripts/analyze-pdf.js
 */

const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'uploads', '60x60 Stickers_DO NOT MODIFY.pdf');

// Read raw PDF content to extract positioning info
const pdfBuffer = fs.readFileSync(pdfPath);
const pdfContent = pdfBuffer.toString('latin1');

// Extract page dimensions
const mediaBoxMatch = pdfContent.match(/\/MediaBox\s*\[\s*(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s*\]/);
if (mediaBoxMatch) {
  const [, x1, y1, x2, y2] = mediaBoxMatch;
  console.log('Page dimensions (points):');
  console.log(`  Width: ${x2} pts (${(parseFloat(x2) / 72 * 25.4).toFixed(2)} mm)`);
  console.log(`  Height: ${y2} pts (${(parseFloat(y2) / 72 * 25.4).toFixed(2)} mm)`);
}

// Look for text content - site names
const textMatches = pdfContent.match(/\(([^)]+)\)\s*Tj/g);
if (textMatches) {
  console.log('\nText content found:');
  const uniqueTexts = [...new Set(textMatches.map(m => m.match(/\(([^)]+)\)/)[1]))];
  uniqueTexts.forEach(t => console.log(`  - "${t}"`));
}

// Look for image references
const imageMatches = pdfContent.match(/\/Im\d+/g);
if (imageMatches) {
  console.log(`\nImages found: ${[...new Set(imageMatches)].length} unique images`);
}

// Extract positioning commands (cm = transformation matrix)
const cmMatches = pdfContent.match(/[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+cm/g);
if (cmMatches) {
  console.log('\nTransformation matrices (positioning):');
  cmMatches.slice(0, 20).forEach((cm, i) => {
    const parts = cm.split(/\s+/);
    // cm format: a b c d e f cm
    // e, f are translation (x, y position)
    // a, d are scale (width, height when b=c=0)
    const [a, b, c, d, e, f] = parts.map(parseFloat);
    if (a > 0 && d > 0) {
      console.log(`  ${i + 1}. Position: (${e.toFixed(1)}, ${f.toFixed(1)}) pts, Size: ${a.toFixed(1)} x ${d.toFixed(1)} pts`);
      console.log(`      = (${(e / 72 * 25.4).toFixed(2)}, ${(f / 72 * 25.4).toFixed(2)}) mm, Size: ${(a / 72 * 25.4).toFixed(2)} x ${(d / 72 * 25.4).toFixed(2)} mm`);
    }
  });
}

// Look for font specifications
const fontMatches = pdfContent.match(/\/F\d+\s+[\d.]+\s+Tf/g);
if (fontMatches) {
  console.log('\nFont specifications:');
  [...new Set(fontMatches)].forEach(f => {
    const size = f.match(/[\d.]+/g)[1];
    console.log(`  Font size: ${size} pts`);
  });
}

// Try to find BT...ET text blocks with positioning
const btEtBlocks = pdfContent.match(/BT[\s\S]*?ET/g);
if (btEtBlocks) {
  console.log(`\nText blocks found: ${btEtBlocks.length}`);
  btEtBlocks.slice(0, 15).forEach((block, i) => {
    const tdMatch = block.match(/([\d.]+)\s+([\d.]+)\s+Td/);
    const textMatch = block.match(/\(([^)]+)\)\s*Tj/);
    if (tdMatch && textMatch) {
      const [, x, y] = tdMatch;
      console.log(`  ${i + 1}. Text "${textMatch[1]}" at (${x}, ${y}) pts = (${(parseFloat(x) / 72 * 25.4).toFixed(2)}, ${(parseFloat(y) / 72 * 25.4).toFixed(2)}) mm`);
    }
  });
}

console.log('\n--- Raw PDF Stream Analysis ---');

// Find stream content
const streamMatch = pdfContent.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
if (streamMatch) {
  // The stream is likely compressed, but let's see what we can find
  console.log('Stream found (may be compressed)');
}

// Output file size
const stats = fs.statSync(pdfPath);
console.log(`\nPDF file size: ${stats.size} bytes`);
