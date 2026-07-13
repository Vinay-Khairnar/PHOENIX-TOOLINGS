const fs = require('fs');
const path = require('path');

// DOCX files are ZIP archives. Let's use Node.js built-in to unzip and read
// We'll use the 'unzipper' or just manually read the zip
// Actually, let's use a simpler approach - the admzip package or just read raw XML

// Since we don't have python-docx, let's try to use jszip or read the zip manually
// Node 22 has built-in zip support? Let's try another approach

// Let's just extract the DOCX as a zip and read the XML files
const { execSync } = require('child_process');

// First, let's try to use PowerShell to extract the DOCX
const docxPath = 'e:/projects/tendor/Letter Head.DOCX';
const extractDir = 'e:/projects/tendor/temp_run/docx_extracted';

// Clean and create extract dir
if (fs.existsSync(extractDir)) {
  fs.rmSync(extractDir, { recursive: true });
}
fs.mkdirSync(extractDir, { recursive: true });

// Copy DOCX to ZIP and extract
const zipPath = path.join(extractDir, 'letterhead.zip');
fs.copyFileSync(docxPath, zipPath);

try {
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}/content' -Force"`, { stdio: 'pipe' });
  console.log('Extracted DOCX successfully');
} catch (e) {
  console.error('Failed to extract:', e.message);
  process.exit(1);
}

// List all files in the extracted directory
function listFiles(dir, prefix = '') {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      console.log(`${prefix}📁 ${item}/`);
      listFiles(fullPath, prefix + '  ');
    } else {
      console.log(`${prefix}📄 ${item} (${stat.size} bytes)`);
    }
  }
}

console.log('\n=== DOCX File Structure ===');
listFiles(path.join(extractDir, 'content'));

// Read document.xml (main content)
const docXmlPath = path.join(extractDir, 'content/word/document.xml');
if (fs.existsSync(docXmlPath)) {
  console.log('\n=== word/document.xml ===');
  const content = fs.readFileSync(docXmlPath, 'utf-8');
  console.log(content.substring(0, 5000));
  if (content.length > 5000) console.log(`\n... (truncated, total ${content.length} chars)`);
}

// Read header files
const wordDir = path.join(extractDir, 'content/word');
const wordFiles = fs.readdirSync(wordDir);
for (const f of wordFiles) {
  if (f.startsWith('header') || f.startsWith('footer')) {
    const fp = path.join(wordDir, f);
    console.log(`\n=== word/${f} ===`);
    const content = fs.readFileSync(fp, 'utf-8');
    console.log(content.substring(0, 3000));
  }
}

// Read styles.xml for font/formatting info  
const stylesPath = path.join(extractDir, 'content/word/styles.xml');
if (fs.existsSync(stylesPath)) {
  console.log('\n=== word/styles.xml (first 3000 chars) ===');
  const content = fs.readFileSync(stylesPath, 'utf-8');
  console.log(content.substring(0, 3000));
}

// Check for images
const mediaDir = path.join(extractDir, 'content/word/media');
if (fs.existsSync(mediaDir)) {
  console.log('\n=== word/media/ (images) ===');
  const mediaFiles = fs.readdirSync(mediaDir);
  for (const f of mediaFiles) {
    const fp = path.join(mediaDir, f);
    const stat = fs.statSync(fp);
    console.log(`  ${f} - ${stat.size} bytes`);
  }
}

// Read relationships to understand image references
const relsPath = path.join(extractDir, 'content/word/_rels/document.xml.rels');
if (fs.existsSync(relsPath)) {
  console.log('\n=== word/_rels/document.xml.rels ===');
  console.log(fs.readFileSync(relsPath, 'utf-8'));
}

// Check header rels too
const headerRelsDir = path.join(extractDir, 'content/word/_rels');
if (fs.existsSync(headerRelsDir)) {
  const relFiles = fs.readdirSync(headerRelsDir);
  for (const f of relFiles) {
    if (f.includes('header') || f.includes('footer')) {
      console.log(`\n=== word/_rels/${f} ===`);
      console.log(fs.readFileSync(path.join(headerRelsDir, f), 'utf-8'));
    }
  }
}
