const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
async function run() {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let y = 800;
    
    const formattedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    page.drawText(`Date: ${formattedDate}`, { x: 50, y, size: 12, font });

    page.drawText(`Rs. ${(100).toFixed(2)}`, { x: 420, y: 700, size: 10, font });
    
    const fs = require('fs');
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('test.pdf', pdfBytes);
    
    console.log("Success, saved to test.pdf");
  } catch(e) {
    console.error("FAIL", e);
  }
}
run();
