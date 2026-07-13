const fs = require('fs');
const path = require('path');

const extractDir = 'e:/projects/tendor/temp_run/docx_extracted/content/word';

// Read all header and footer XMLs
const files = ['header1.xml', 'header2.xml', 'header3.xml', 'footer1.xml', 'footer2.xml', 'footer3.xml', 'document.xml'];

for (const f of files) {
  const fp = path.join(extractDir, f);
  if (fs.existsSync(fp)) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`FILE: ${f}`);
    console.log('='.repeat(80));
    const content = fs.readFileSync(fp, 'utf-8');
    
    // Extract text content from XML (simple regex approach)
    // Find all w:t elements
    const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (textMatches) {
      console.log('\nText content:');
      const texts = textMatches.map(m => {
        const match = m.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        return match ? match[1] : '';
      });
      console.log(texts.join(' | '));
    }
    
    // Find font info
    const fontMatches = content.match(/<w:rFonts[^/]*\/>/g);
    if (fontMatches) {
      console.log('\nFonts used:');
      const uniqueFonts = new Set();
      fontMatches.forEach(m => {
        const ascii = m.match(/w:ascii="([^"]*)"/);
        const hAnsi = m.match(/w:hAnsi="([^"]*)"/);
        const cs = m.match(/w:cs="([^"]*)"/);
        if (ascii) uniqueFonts.add(ascii[1]);
        if (hAnsi) uniqueFonts.add(hAnsi[1]);
        if (cs) uniqueFonts.add(cs[1]);
      });
      console.log([...uniqueFonts].join(', '));
    }
    
    // Find font sizes
    const sizeMatches = content.match(/<w:sz w:val="([^"]*)"/g);
    if (sizeMatches) {
      console.log('\nFont sizes (half-points):');
      const uniqueSizes = new Set(sizeMatches.map(m => {
        const match = m.match(/w:val="([^"]*)"/);
        return match ? match[1] : '';
      }));
      console.log([...uniqueSizes].map(s => `${s} (${parseInt(s)/2}pt)`).join(', '));
    }
    
    // Find colors
    const colorMatches = content.match(/<w:color w:val="([^"]*)"/g);
    if (colorMatches) {
      console.log('\nColors:');
      const uniqueColors = new Set(colorMatches.map(m => {
        const match = m.match(/w:val="([^"]*)"/);
        return match ? match[1] : '';
      }));
      console.log([...uniqueColors].join(', '));
    }
    
    // Find bold
    const boldMatches = content.match(/<w:b\/>/g) || content.match(/<w:b w/g);
    if (boldMatches) {
      console.log(`\nBold elements: ${boldMatches.length}`);
    }
    
    // Check for images
    const imgMatches = content.match(/<a:blip[^>]*>/g);
    if (imgMatches) {
      console.log('\nImage references:');
      imgMatches.forEach(m => console.log('  ' + m));
    }
    
    // Check for tables
    const tableMatches = content.match(/<w:tbl>/g);
    if (tableMatches) {
      console.log(`\nTables: ${tableMatches.length}`);
    }

    // Print raw XML for shorter files
    if (content.length < 8000) {
      console.log('\n--- Raw XML ---');
      console.log(content);
    } else {
      console.log(`\n(File is ${content.length} chars, showing first 8000)`);
      console.log(content.substring(0, 8000));
    }
  }
}

// Also read the document settings for page margins
const settingsPath = path.join(extractDir, '../content/word/settings.xml');
const docPath = path.join(extractDir, 'document.xml');
if (fs.existsSync(docPath)) {
  const content = fs.readFileSync(docPath, 'utf-8');
  // Find page size and margins
  const pgSz = content.match(/<w:pgSz[^/]*\/>/g);
  const pgMar = content.match(/<w:pgMar[^/]*\/>/g);
  if (pgSz) {
    console.log('\n=== Page Size ===');
    pgSz.forEach(m => console.log(m));
  }
  if (pgMar) {
    console.log('\n=== Page Margins ===');
    pgMar.forEach(m => console.log(m));
  }
}
