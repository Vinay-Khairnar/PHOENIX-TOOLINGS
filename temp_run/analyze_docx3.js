const fs = require('fs');
const path = require('path');

const extractDir = 'e:/projects/tendor/temp_run/docx_extracted/content/word';

// Read all text content from document.xml in structured form
const docContent = fs.readFileSync(path.join(extractDir, 'document.xml'), 'utf-8');

// Extract all text from each table row
console.log('=== DOCUMENT TEXT STRUCTURE ===\n');

// Find all table rows and their text
const rows = docContent.split('<w:tr ');
console.log(`Found ${rows.length - 1} table rows\n`);

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const textMatches = row.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (textMatches) {
    const texts = textMatches.map(m => {
      const match = m.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
      return match ? match[1] : '';
    }).filter(t => t.trim());
    if (texts.length > 0) {
      console.log(`Row ${i}: ${texts.join(' | ')}`);
    } else {
      console.log(`Row ${i}: (empty)`);
    }
  } else {
    console.log(`Row ${i}: (no text)`);
  }
}

// Now read headers
console.log('\n\n=== HEADERS ===');
for (let h = 1; h <= 3; h++) {
  const headerPath = path.join(extractDir, `header${h}.xml`);
  if (fs.existsSync(headerPath)) {
    const content = fs.readFileSync(headerPath, 'utf-8');
    const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    console.log(`\nHeader ${h}:`);
    if (textMatches) {
      const texts = textMatches.map(m => {
        const match = m.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        return match ? match[1] : '';
      });
      console.log('  Text: ' + texts.join(''));
    }
    // Check for images
    const imgMatches = content.match(/<a:blip[^>]*>/g);
    if (imgMatches) {
      console.log('  Images: ' + imgMatches.length);
      imgMatches.forEach(m => console.log('    ' + m));
    }
    
    // Check for drawing/image dimensions
    const extentMatches = content.match(/<wp:extent[^>]*\/>/g);
    if (extentMatches) {
      console.log('  Image extents:');
      extentMatches.forEach(m => {
        const cx = m.match(/cx="(\d+)"/);
        const cy = m.match(/cy="(\d+)"/);
        if (cx && cy) {
          console.log(`    Width: ${parseInt(cx[1])/914400} inches, Height: ${parseInt(cy[1])/914400} inches`);
        }
      });
    }
  }
}

// Footers
console.log('\n\n=== FOOTERS ===');
for (let f = 1; f <= 3; f++) {
  const footerPath = path.join(extractDir, `footer${f}.xml`);
  if (fs.existsSync(footerPath)) {
    const content = fs.readFileSync(footerPath, 'utf-8');
    const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    console.log(`\nFooter ${f}:`);
    if (textMatches) {
      const texts = textMatches.map(m => {
        const match = m.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        return match ? match[1] : '';
      });
      console.log('  Text: ' + texts.join(''));
    } else {
      console.log('  (no text)');
    }
  }
}

// Extract full document structure - paragraphs outside tables
console.log('\n\n=== BODY PARAGRAPHS (outside tables) ===');
// Split by body tag
const bodyMatch = docContent.match(/<w:body>([\s\S]*)<\/w:body>/);
if (bodyMatch) {
  // Get paragraphs that are direct children of body (not inside tables)
  // Simple approach: remove table content first
  let bodyContent = bodyMatch[1];
  // Remove all table content
  bodyContent = bodyContent.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, '[TABLE]');
  
  const paraMatches = bodyContent.match(/<w:p [^>]*>[\s\S]*?<\/w:p>/g);
  if (paraMatches) {
    for (let i = 0; i < paraMatches.length; i++) {
      const para = paraMatches[i];
      const textMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (textMatches) {
        const texts = textMatches.map(m => {
          const match = m.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
          return match ? match[1] : '';
        });
        console.log(`Para ${i}: ${texts.join('')}`);
      }
    }
  }
}

// Check image in document body
console.log('\n\n=== IMAGES IN DOCUMENT BODY ===');
const bodyImgMatches = docContent.match(/<a:blip[^>]*>/g);
if (bodyImgMatches) {
  bodyImgMatches.forEach(m => console.log(m));
}

// Get image dimensions from document
const bodyExtentMatches = docContent.match(/<wp:extent[^>]*\/>/g);
if (bodyExtentMatches) {
  console.log('\nImage dimensions in body:');
  bodyExtentMatches.forEach(m => {
    const cx = m.match(/cx="(\d+)"/);
    const cy = m.match(/cy="(\d+)"/);
    if (cx && cy) {
      console.log(`  Width: ${(parseInt(cx[1])/914400).toFixed(2)} inches, Height: ${(parseInt(cy[1])/914400).toFixed(2)} inches`);
    }
  });
}
