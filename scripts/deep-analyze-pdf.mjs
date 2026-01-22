/**
 * Deep PDF Template Analysis
 * Extracts exact colors, fonts, and styling from the template
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deepAnalyzePdf() {
  const pdfPath = path.join(__dirname, '..', 'uploads', '60x60 Stickers_DO NOT MODIFY.pdf');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  console.log(`=== Deep PDF Template Analysis ===\n`);
  
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  
  console.log(`Page size: ${viewport.width} x ${viewport.height} pts`);
  console.log(`Page size: ${(viewport.width / 72 * 25.4).toFixed(2)} x ${(viewport.height / 72 * 25.4).toFixed(2)} mm\n`);
  
  // Get text content with styles
  const textContent = await page.getTextContent({ includeMarkedContent: true });
  
  console.log(`=== Text Styling Analysis ===\n`);
  
  // Analyze text items
  const uniqueStyles = new Map();
  
  textContent.items.forEach((item, index) => {
    if (item.str && item.str.trim()) {
      const styleKey = JSON.stringify({
        fontName: item.fontName,
        transform: item.transform.map(t => t.toFixed(2))
      });
      
      if (!uniqueStyles.has(styleKey)) {
        uniqueStyles.set(styleKey, {
          fontName: item.fontName,
          transform: item.transform,
          example: item.str,
          height: item.height,
          width: item.width
        });
      }
    }
  });
  
  console.log(`Unique text styles found: ${uniqueStyles.size}\n`);
  uniqueStyles.forEach((style, key) => {
    console.log(`Font: ${style.fontName}`);
    console.log(`  Transform: [${style.transform.map(t => t.toFixed(2)).join(', ')}]`);
    console.log(`  Scale X: ${Math.abs(style.transform[0]).toFixed(2)}`);
    console.log(`  Scale Y: ${Math.abs(style.transform[3]).toFixed(2)}`);
    console.log(`  Example: "${style.example}"`);
    console.log('');
  });
  
  // Get operator list for detailed analysis
  const opList = await page.getOperatorList();
  
  console.log(`=== Graphics State Analysis ===\n`);
  console.log(`Total operators: ${opList.fnArray.length}`);
  
  // Count operator types
  const opCounts = {};
  opList.fnArray.forEach(op => {
    opCounts[op] = (opCounts[op] || 0) + 1;
  });
  
  // Map operator codes to names
  const opNames = {
    [pdfjsLib.OPS.setFillRGBColor]: 'setFillRGBColor',
    [pdfjsLib.OPS.setStrokeRGBColor]: 'setStrokeRGBColor',
    [pdfjsLib.OPS.setFillGray]: 'setFillGray',
    [pdfjsLib.OPS.setStrokeGray]: 'setStrokeGray',
    [pdfjsLib.OPS.setFillCMYKColor]: 'setFillCMYKColor',
    [pdfjsLib.OPS.paintImageXObject]: 'paintImageXObject',
    [pdfjsLib.OPS.setFont]: 'setFont',
    [pdfjsLib.OPS.showText]: 'showText',
    [pdfjsLib.OPS.setTextMatrix]: 'setTextMatrix',
    [pdfjsLib.OPS.beginText]: 'beginText',
    [pdfjsLib.OPS.endText]: 'endText',
    [pdfjsLib.OPS.rectangle]: 'rectangle',
    [pdfjsLib.OPS.fill]: 'fill',
    [pdfjsLib.OPS.stroke]: 'stroke',
  };
  
  console.log('\nOperator counts:');
  Object.entries(opCounts).forEach(([op, count]) => {
    const name = opNames[op] || `op_${op}`;
    if (count > 0) {
      console.log(`  ${name}: ${count}`);
    }
  });
  
  // Look for color settings
  console.log('\n=== Color Analysis ===\n');
  
  const colors = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    const op = opList.fnArray[i];
    const args = opList.argsArray[i];
    
    if (op === pdfjsLib.OPS.setFillRGBColor) {
      colors.push({ type: 'fill RGB', r: args[0], g: args[1], b: args[2] });
    } else if (op === pdfjsLib.OPS.setStrokeRGBColor) {
      colors.push({ type: 'stroke RGB', r: args[0], g: args[1], b: args[2] });
    } else if (op === pdfjsLib.OPS.setFillGray) {
      colors.push({ type: 'fill gray', value: args[0] });
    } else if (op === pdfjsLib.OPS.setStrokeGray) {
      colors.push({ type: 'stroke gray', value: args[0] });
    }
  }
  
  // Unique colors
  const uniqueColors = [...new Map(colors.map(c => [JSON.stringify(c), c])).values()];
  console.log(`Unique colors found: ${uniqueColors.length}`);
  uniqueColors.forEach(c => {
    if (c.type.includes('RGB')) {
      const r = Math.round(c.r * 255);
      const g = Math.round(c.g * 255);
      const b = Math.round(c.b * 255);
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      console.log(`  ${c.type}: RGB(${r}, ${g}, ${b}) = ${hex}`);
    } else {
      console.log(`  ${c.type}: ${c.value}`);
    }
  });
  
  // Look for images
  console.log('\n=== Image Analysis ===\n');
  
  let imageCount = 0;
  const imagePositions = [];
  
  for (let i = 0; i < opList.fnArray.length; i++) {
    const op = opList.fnArray[i];
    const args = opList.argsArray[i];
    
    if (op === pdfjsLib.OPS.paintImageXObject) {
      imageCount++;
      // The image name is in args
      console.log(`Image ${imageCount}: ${args[0]}`);
    }
    
    if (op === pdfjsLib.OPS.transform) {
      // Transformation matrix before image
      const [a, b, c, d, e, f] = args;
      if (a > 100 && d > 100) { // Likely an image transform
        imagePositions.push({
          width: a,
          height: d,
          x: e,
          y: f,
          xMm: (e / 72 * 25.4).toFixed(2),
          yMm: (f / 72 * 25.4).toFixed(2),
          widthMm: (a / 72 * 25.4).toFixed(2),
          heightMm: (d / 72 * 25.4).toFixed(2)
        });
      }
    }
  }
  
  console.log(`\nTotal images: ${imageCount}`);
  console.log(`\nImage positions (transform matrices):`);
  imagePositions.slice(0, 12).forEach((pos, i) => {
    console.log(`  ${i + 1}. Position: (${pos.xMm}mm, ${pos.yMm}mm) Size: ${pos.widthMm}mm x ${pos.heightMm}mm`);
  });
  
  // Get structured content
  console.log('\n=== First few text items with full details ===\n');
  
  textContent.items.slice(0, 6).forEach((item, i) => {
    if (item.str) {
      console.log(`${i + 1}. "${item.str}"`);
      console.log(`   Font: ${item.fontName}`);
      console.log(`   Transform: [${item.transform.join(', ')}]`);
      console.log(`   Width: ${item.width}, Height: ${item.height}`);
      console.log(`   Direction: ${item.dir}`);
      console.log('');
    }
  });
}

deepAnalyzePdf().catch(console.error);
