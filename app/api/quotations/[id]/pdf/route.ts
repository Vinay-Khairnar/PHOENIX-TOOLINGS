import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts, PDFImage } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

function formatIndianCurrency(num: number): string {
  const x = num.toFixed(2);
  const parts = x.split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers != '') {
    lastThree = ',' + lastThree;
  }
  const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree + '.' + parts[1];
  return res;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });

    if (!quote) return new NextResponse('Quote not found', { status: 404 });

    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont((StandardFonts as any).Helvetica);
    const boldFont = await pdfDoc.embedFont((StandardFonts as any).HelveticaBold);
    
    let letterheadBytes;
    try {
      const letterheadPath = path.join(process.cwd(), 'public', 'letterhead.jpg');
      letterheadBytes = fs.readFileSync(letterheadPath);
    } catch (e) {
      console.error('Could not load letterhead.jpg', e);
    }

    let letterheadImage: PDFImage | undefined;
    if (letterheadBytes) {
      letterheadImage = await pdfDoc.embedJpg(letterheadBytes);
    }

    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    
    const MARGIN_LEFT = 40;
    const MARGIN_RIGHT = A4_WIDTH - 55;
    const CONTENT_WIDTH = MARGIN_RIGHT - MARGIN_LEFT;
    const TOP_MARGIN = A4_HEIGHT - 120;
    const BOTTOM_MARGIN = 80;
    
    let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    let y = TOP_MARGIN;

    const addBackground = () => {
      if (letterheadImage) {
        page.drawImage(letterheadImage, {
          x: 0,
          y: 0,
          width: A4_WIDTH,
          height: A4_HEIGHT,
        });
      }
    };

    const checkNewPage = (neededHeight: number) => {
      if (y - neededHeight < BOTTOM_MARGIN) {
        page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        addBackground();
        y = TOP_MARGIN;
        return true;
      }
      return false;
    };

    addBackground();

    // Row 1: QUOTATION
    page.drawRectangle({
      x: MARGIN_LEFT, y: y - 20, width: CONTENT_WIDTH, height: 20,
      borderColor: rgb(0,0,0), borderWidth: 1
    });
    const titleText = "QUOTATION";
    const titleWidth = boldFont.widthOfTextAtSize(titleText, 14);
    page.drawText(titleText, { x: MARGIN_LEFT + (CONTENT_WIDTH - titleWidth) / 2, y: y - 15, size: 14, font: boldFont });
    y -= 20;

    // Row 2-5: Customer & Quote Info
    const infoHeight = 60;
    page.drawRectangle({
      x: MARGIN_LEFT, y: y - infoHeight, width: CONTENT_WIDTH, height: infoHeight,
      borderColor: rgb(0,0,0), borderWidth: 1
    });
    
    // Vertical separator
    const midX = MARGIN_LEFT + CONTENT_WIDTH * 0.6;
    page.drawLine({
      start: { x: midX, y },
      end: { x: midX, y: y - infoHeight },
      thickness: 1, color: rgb(0,0,0)
    });

    const leftX = MARGIN_LEFT + 5;
    const rightX = midX + 5;
    
    page.drawText("TO,", { x: leftX, y: y - 12, size: 10, font: font });
    page.drawText("QTN NO.-", { x: rightX, y: y - 12, size: 10, font: boldFont });
    page.drawText(quote.quoteNumber, { x: rightX + 60, y: y - 12, size: 10, font: font });

    page.drawText(quote.customer.name, { x: leftX, y: y - 24, size: 10, font: boldFont });
    const formattedDate = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '';
    page.drawText("QTN DATE", { x: rightX, y: y - 24, size: 10, font: boldFont });
    page.drawText(formattedDate, { x: rightX + 60, y: y - 24, size: 10, font: font });

    let addr1 = "";
    let addr2 = "";
    if (quote.customer.address) {
      const parts = quote.customer.address.split('\n');
      addr1 = parts[0] || '';
      addr2 = parts.length > 1 ? parts.slice(1).join(', ') : '';
    }
    
    page.drawText(addr1.substring(0, 50), { x: leftX, y: y - 36, size: 10, font: font });
    page.drawText("REF NO.-", { x: rightX, y: y - 36, size: 10, font: boldFont });
    page.drawText(quote.refNumber || "BY MAIL", { x: rightX + 60, y: y - 36, size: 10, font: font });

    page.drawText(addr2.substring(0, 50), { x: leftX, y: y - 48, size: 10, font: font });
    page.drawText("REF DATE.-", { x: rightX, y: y - 48, size: 10, font: boldFont });
    page.drawText(quote.refDate ? new Date(quote.refDate).toLocaleDateString('en-GB').replace(/\//g, '-') : "", { x: rightX + 60, y: y - 48, size: 10, font: font });

    y -= infoHeight;

    // Spacing
    y -= 10;

    if (quote.contactPerson) {
      page.drawText(`KIND ATTN- ${quote.contactPerson}`, { x: MARGIN_LEFT, y, size: 10, font: boldFont });
      y -= 15;
    }

    page.drawText("With Reference to your enquiry we are submitting our quotation as follows", { x: MARGIN_LEFT, y, size: 10, font: font });
    y -= 15;

    // Table Header
    const colWidths = [35, 60, 190, 35, 60, 60, 60];
    const headers = ["SR NO.", "PART NO.", "DESCRIPTION", "QTY", "UNIT PRICE", "NET PRICE", "AMOUNT"];
    
    const drawRow = (yPos: number, texts: string[], isHeader: boolean = false, rowHeight: number = 20) => {
      let curX = MARGIN_LEFT;
      page.drawRectangle({
        x: MARGIN_LEFT, y: yPos - rowHeight, width: CONTENT_WIDTH, height: rowHeight,
        borderColor: rgb(0,0,0), borderWidth: 1
      });
      
      for (let i = 0; i < texts.length; i++) {
        const cWidth = colWidths[i];
        if (i > 0) {
          page.drawLine({
            start: { x: curX, y: yPos },
            end: { x: curX, y: yPos - rowHeight },
            thickness: 1, color: rgb(0,0,0)
          });
        }
        
        const f = isHeader ? boldFont : font;
        const fontSize = 9;
        
        let text = texts[i];
        if (text) {
          if (f.widthOfTextAtSize(text, fontSize) > cWidth - 4) {
             text = text.substring(0, 25) + '...';
          }
          const tWidth = f.widthOfTextAtSize(text, fontSize);
          
          let textX = curX + 2;
          if (isHeader || i === 0 || i === 3) {
             textX = curX + (cWidth - tWidth) / 2;
          } else if (i >= 4) {
             textX = curX + cWidth - tWidth - 2;
          }

          page.drawText(text, { x: textX, y: yPos - 14, size: fontSize, font: f });
        }
        curX += cWidth;
      }
    };

    drawRow(y, headers, true, 25);
    y -= 25;

    let srNo = 1;
    let subtotal = 0;
    for (const item of quote.items) {
      checkNewPage(20);
      
      const itemDiscount = item.discount || 0;
      const netPrice = item.price * (1 - itemDiscount / 100);
      const amount = netPrice * item.quantity;
      subtotal += amount;

      let desc = item.name;
      if (itemDiscount > 0) desc += ` (-${itemDiscount}%)`;

      drawRow(y, [
        srNo.toString(),
        item.articleNumber || "-",
        desc,
        item.quantity.toString(),
        formatIndianCurrency(item.price),
        formatIndianCurrency(netPrice),
        formatIndianCurrency(amount)
      ], false, 20);
      
      y -= 20;
      srNo++;
    }

    // Taxes & Summary
    checkNewPage(120);
    
    const summaryHeight = 100;
    const sumY = y - summaryHeight;
    page.drawRectangle({
      x: MARGIN_LEFT, y: sumY, width: CONTENT_WIDTH, height: summaryHeight,
      borderColor: rgb(0,0,0), borderWidth: 1
    });

    const taxColX = MARGIN_LEFT + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    page.drawLine({
      start: { x: taxColX, y },
      end: { x: taxColX, y: sumY },
      thickness: 1, color: rgb(0,0,0)
    });
    
    const amountColX = taxColX + colWidths[4] + colWidths[5];
    page.drawLine({
      start: { x: amountColX, y },
      end: { x: amountColX, y: sumY },
      thickness: 1, color: rgb(0,0,0)
    });

    for (let i = 1; i < 5; i++) {
      page.drawLine({
        start: { x: MARGIN_LEFT, y: y - i * 20 },
        end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: y - i * 20 },
        thickness: 1, color: rgb(0,0,0)
      });
    }

    page.drawText("BANK DETAILS", { x: MARGIN_LEFT + 5, y: y - 14, size: 10, font: boldFont });
    page.drawText(`BANK NAME-${settings?.bankName || ''}`, { x: MARGIN_LEFT + 5, y: y - 34, size: 9, font: font });
    page.drawText(`ACCOUNT NO-${settings?.accountNumber || ''}`, { x: MARGIN_LEFT + 5, y: y - 54, size: 9, font: font });
    page.drawText(`IFSC CODE-${settings?.ifscCode || ''}`, { x: MARGIN_LEFT + 5, y: y - 74, size: 9, font: font });

    const discountAmount = subtotal * ((quote.discount || 0) / 100);
    const taxableAmount = subtotal - discountAmount;
    
    const cgstAmt = taxableAmount * ((quote.cgst || 0) / 100);
    const sgstAmt = taxableAmount * ((quote.sgst || 0) / 100);
    const igstAmt = taxableAmount * ((quote.igst || 0) / 100);
    const grandTotal = taxableAmount + cgstAmt + sgstAmt + igstAmt;

    const drawTaxRow = (rowY: number, label: string, amountStr: string, isBold = false) => {
      const f = isBold ? boldFont : font;
      page.drawText(label, { x: taxColX + 5, y: rowY - 14, size: 9, font: f });
      const w = f.widthOfTextAtSize(amountStr, 9);
      page.drawText(amountStr, { x: MARGIN_LEFT + CONTENT_WIDTH - w - 5, y: rowY - 14, size: 9, font: f });
    };

    drawTaxRow(y, "TAXABLE AMOUNT", formatIndianCurrency(taxableAmount), true);
    drawTaxRow(y - 20, `CGST ${quote.cgst || 0}%`, formatIndianCurrency(cgstAmt));
    drawTaxRow(y - 40, `SGST ${quote.sgst || 0}%`, formatIndianCurrency(sgstAmt));
    drawTaxRow(y - 60, `IGST ${quote.igst || 0}%`, formatIndianCurrency(igstAmt));
    drawTaxRow(y - 80, "TOTAL", formatIndianCurrency(grandTotal), true);

    y -= summaryHeight;

    checkNewPage(120);
    
    y -= 10;
    page.drawText("TERMS & CONDITIONS", { x: MARGIN_LEFT, y, size: 10, font: boldFont });
    page.drawText(`FOR, ${settings?.companyName || 'PHOENIX TOOLINGS'}`, { x: MARGIN_LEFT + CONTENT_WIDTH - 150, y, size: 10, font: boldFont });
    
    y -= 15;
    const terms = (settings?.termsAndConditions || "").split('\n');
    for (const term of terms) {
      if (term.trim()) {
        page.drawText(term.trim(), { x: MARGIN_LEFT, y, size: 9, font });
        y -= 12;
      }
    }

    y -= 30;
    page.drawText("Authorised Signatory", { x: MARGIN_LEFT + CONTENT_WIDTH - 130, y, size: 10, font: boldFont });

    const footerY = 50;
    const fText1 = "This is a system generated Quotation";
    const fText2 = "SUBJECTED TO CH. SAMBHAJI NAGAR JURISDICTION";
    
    const w1 = font.widthOfTextAtSize(fText1, 8);
    const w2 = font.widthOfTextAtSize(fText2, 8);
    
    page.drawText(fText1, { x: (A4_WIDTH - w1) / 2, y: footerY, size: 8, font });
    page.drawText(fText2, { x: (A4_WIDTH - w2) / 2, y: footerY - 12, size: 8, font });

    const pdfBytes = await pdfDoc.save();

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quoteNumber}.pdf"`,
      },
    });

  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
