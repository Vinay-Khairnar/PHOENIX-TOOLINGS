import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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
    const { data: quoteRaw, error: quoteError } = await supabase
      .from('Quote')
      .select('*, Customer(*), items:QuoteItem(*)')
      .eq('id', id)
      .single();

    if (quoteError || !quoteRaw) return new NextResponse('Quote not found', { status: 404 });

    const quote = {
      ...quoteRaw,
      customerName: (quoteRaw.Customer as any)?.name,
      customerEmail: (quoteRaw.Customer as any)?.email,
      customerPhone: (quoteRaw.Customer as any)?.phone,
      customerAddress: (quoteRaw.Customer as any)?.address,
    };

    const { data: settings } = await supabase
      .from('Settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    
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

    let letterheadImage: any;
    if (letterheadBytes) {
      letterheadImage = await pdfDoc.embedJpg(letterheadBytes);
    }

    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    
    // Adjusted margins to match the sample PDF (leaving room for right sidebar)
    const MARGIN_LEFT = 15;
    const CONTENT_WIDTH = 545; // Exact width to fit columns nicely
    const TOP_MARGIN = A4_HEIGHT - 120; // Starts below the pre-printed header
    
    // Global Totals Calculation
    let globalSubtotal = 0;
    for (const item of quote.items) {
      const itemDiscount = item.discount || 0;
      const netPrice = item.price * (1 - itemDiscount / 100);
      globalSubtotal += netPrice * item.quantity;
    }
    const discountAmount = globalSubtotal * ((quote.discount || 0) / 100);
    const taxableAmount = globalSubtotal - discountAmount;
    const cgstAmt = taxableAmount * ((quote.cgst || 0) / 100);
    const sgstAmt = taxableAmount * ((quote.sgst || 0) / 100);
    const igstAmt = taxableAmount * ((quote.igst || 0) / 100);
    const grandTotal = taxableAmount + cgstAmt + sgstAmt + igstAmt;

    const chunks = [];
    if (quote.items.length === 0) chunks.push([]);
    for (let i = 0; i < quote.items.length; i += 12) {
      chunks.push(quote.items.slice(i, i + 12));
    }

    for (let pageIndex = 0; pageIndex < chunks.length; pageIndex++) {
      const currentChunk = chunks[pageIndex];
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

    addBackground();

    const drawGridCell = (text: string, x: number, yPos: number, w: number, h: number, f: any, size: number, align: 'left' | 'center' | 'right' = 'left', drawBox = true) => {
      if (drawBox) {
        page.drawRectangle({ x, y: yPos - h, width: w, height: h, borderColor: rgb(0,0,0), borderWidth: 1 });
      }
      if (text) {
        const textWidth = f.widthOfTextAtSize(text, size);
        let textX = x + 3;
        if (align === 'center') textX = x + (w - textWidth) / 2;
        if (align === 'right') textX = x + w - textWidth - 3;
        const textY = yPos - h / 2 - size / 3;
        page.drawText(text, { x: textX, y: textY, size, font: f });
      }
    }

    // 1. QUOTATION Title
    const row1Height = 20;
    drawGridCell("QUOTATION", MARGIN_LEFT, y, CONTENT_WIDTH, row1Height, boldFont, 12, 'center');
    y -= row1Height;

    // 2. Info Block
    const leftWidth = CONTENT_WIDTH * 0.61;
    const rightWidth = CONTENT_WIDTH - leftWidth;
    const row2Height = 80;

    // Draw outer box for the info block
    page.drawRectangle({ x: MARGIN_LEFT, y: y - row2Height, width: CONTENT_WIDTH, height: row2Height, borderColor: rgb(0,0,0), borderWidth: 1 });
    page.drawLine({ start: { x: MARGIN_LEFT + leftWidth, y }, end: { x: MARGIN_LEFT + leftWidth, y: y - row2Height }, thickness: 1, color: rgb(0,0,0) });

    // Left Content
    const leftPad = MARGIN_LEFT + 5;
    page.drawText("TO,", { x: leftPad, y: y - 12, size: 9, font: font });
    page.drawText(quote.customerName || '', { x: leftPad, y: y - 26, size: 10, font: boldFont });
    
    let addrLines = (quote.customerAddress || "").split('\n');
    let addrY = y - 40;
    for (const line of addrLines) {
      if (addrY < y - 75) break;
      page.drawText(line.substring(0, 60), { x: leftPad, y: addrY, size: 9, font: font });
      addrY -= 12;
    }

    // Right Content
    const rightLabelW = rightWidth * 0.45;
    const rightX = MARGIN_LEFT + leftWidth;
    
    // (Horizontal and vertical separation lines removed as per user request)
    const rightRowH = row2Height / 4;

    const qtnDate = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '';
    const refDate = quote.refDate ? new Date(quote.refDate).toLocaleDateString('en-GB').replace(/\//g, '-') : '';

    const drawRightCell = (label: string, val: string, index: number) => {
        const rowY = y - index * rightRowH;
        page.drawText(label, { x: rightX + 3, y: rowY - 13, size: 9, font: font });
        page.drawText(val, { x: rightX + rightLabelW + 3, y: rowY - 13, size: 9, font: font });
    }

    drawRightCell("QTY NO.:", quote.quoteNumber, 0);
    drawRightCell("QTN DATE:", qtnDate, 1);
    drawRightCell("REF NO.:", quote.refNumber || "AS PER VISIT", 2);
    drawRightCell("REF DATE.:", refDate, 3);

    y -= row2Height;

    // 3. KIND ATTN
    const row3Height = 20;
    page.drawRectangle({ x: MARGIN_LEFT, y: y - row3Height, width: CONTENT_WIDTH, height: row3Height, borderColor: rgb(0,0,0), borderWidth: 1 });
    page.drawText(`KIND ATTN- ${quote.contactPerson || ''}`, { x: MARGIN_LEFT + 5, y: y - 13, size: 9, font: font });
    y -= row3Height;

    // 4. Reference
    const row4Height = 20;
    drawGridCell("With Reference to your enquiry we are submitting our quotation as follows", MARGIN_LEFT, y, CONTENT_WIDTH, row4Height, font, 9, 'center');
    y -= row4Height;

    // 5. Table Header
    const colWidths = [30, 65, 160, 35, 65, 65, 55, 70];
    const headers = ["SR NO.", "PART NO.", "DESCRIPTION", "QTY", "UNIT / PRICE", "NET PRICE", "DICSOUNT", "AMOUNT"];
    const headerHeight = 20;
    let curX = MARGIN_LEFT;
    for (let i = 0; i < headers.length; i++) {
        drawGridCell(headers[i], curX, y, colWidths[i], headerHeight, boldFont, 8, 'center');
        curX += colWidths[i];
    }
    y -= headerHeight;

    // 6. Table Body (Fixed grid)
    const numRows = 12;
    const rowHeight = 18; // slightly smaller row height to fit everything nicely
    const tableBodyHeight = numRows * rowHeight;

    // Draw outer rectangle for the whole table body and vertical column lines
    page.drawRectangle({ x: MARGIN_LEFT, y: y - tableBodyHeight, width: CONTENT_WIDTH, height: tableBodyHeight, borderColor: rgb(0,0,0), borderWidth: 1 });
    let vertX = MARGIN_LEFT;
    for (let j = 0; j < colWidths.length - 1; j++) {
        vertX += colWidths[j];
        page.drawLine({ start: { x: vertX, y: y }, end: { x: vertX, y: y - tableBodyHeight }, thickness: 1, color: rgb(0,0,0) });
    }
    
    for (let i = 0; i < numRows; i++) {
        const item = currentChunk[i];
        let rowTexts = ["", "", "", "", "", "", "", ""];
        
        if (item) {
            const itemDiscount = item.discount || 0;
            const netPrice = item.price * (1 - itemDiscount / 100);
            const amount = netPrice * item.quantity;
            const itemIndex = pageIndex * 12 + i + 1;

            rowTexts = [
                itemIndex.toString(),
                item.articleNumber || "",
                item.name || "",
                item.quantity.toString(),
                formatIndianCurrency(item.price),
                formatIndianCurrency(netPrice),
                itemDiscount > 0 ? `${itemDiscount}%` : "",
                formatIndianCurrency(amount)
            ];
        }

        let curRowX = MARGIN_LEFT;
        for (let j = 0; j < colWidths.length; j++) {
            if (rowTexts[j]) {
                const align = (j === 0 || j === 3 || j === 6) ? 'center' : (j >= 4 ? 'right' : 'left');
                
                let text = rowTexts[j];
                if (j === 2 && font.widthOfTextAtSize(text, 9) > colWidths[j] - 6) {
                    text = text.substring(0, 30) + '...';
                }
                
                const tWidth = font.widthOfTextAtSize(text, 9);
                let textX = curRowX + 3;
                if (align === 'center') textX = curRowX + (colWidths[j] - tWidth) / 2;
                if (align === 'right') textX = curRowX + colWidths[j] - tWidth - 3;
                
                page.drawText(text, { x: textX, y: y - 12, size: 9, font: font });
            }
            curRowX += colWidths[j];
        }
        y -= rowHeight;
    }

    // 7. Bank Details & Totals
    const bankBoxWidth = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4];
    const totalsBoxWidth = CONTENT_WIDTH - bankBoxWidth;
    const summaryHeight = 100;
    
    const isLastPage = pageIndex === chunks.length - 1;
    
    // Draw outer summary box
    page.drawRectangle({ x: MARGIN_LEFT, y: y - summaryHeight, width: CONTENT_WIDTH, height: summaryHeight, borderColor: rgb(0,0,0), borderWidth: 1 });
    page.drawLine({ start: { x: MARGIN_LEFT + bankBoxWidth, y }, end: { x: MARGIN_LEFT + bankBoxWidth, y: y - summaryHeight }, thickness: 1, color: rgb(0,0,0) });

    const bankPad = MARGIN_LEFT + 5;
    page.drawText("BANK DETAILS", { x: bankPad, y: y - 12, size: 10, font: boldFont });
    page.drawText(`BANK NAME-${settings?.bankName || 'ICICI BANK'}`, { x: bankPad, y: y - 28, size: 10, font: boldFont });
    page.drawText(`ACCOUNT NO-${settings?.accountNumber || '145405004957'}`, { x: bankPad, y: y - 44, size: 10, font: boldFont });
    page.drawText(`IFSC CODE-${settings?.ifscCode || 'ICIC0001454'}`, { x: bankPad, y: y - 60, size: 10, font: boldFont });

    page.drawLine({ start: { x: MARGIN_LEFT, y: y - 72 }, end: { x: MARGIN_LEFT + bankBoxWidth, y: y - 72 }, thickness: 1, color: rgb(0,0,0) });
    const gstStr = `GST NO-${settings?.gstNumber || '27AFWPG3321F1ZH'}`;
    page.drawText(gstStr, { x: bankPad, y: y - 88, size: 12, font: boldFont });

    const drawTaxRow = (rowY: number, label: string, amountStr: string, isBold = false) => {
        const f = isBold ? boldFont : font;
        page.drawText(label, { x: MARGIN_LEFT + bankBoxWidth + 3, y: rowY - 14, size: 9, font: f });
        const w = f.widthOfTextAtSize(amountStr, 9);
        page.drawText(amountStr, { x: MARGIN_LEFT + CONTENT_WIDTH - w - 3, y: rowY - 14, size: 9, font: f });
    };

    if (isLastPage) {
        const totalLabelW = totalsBoxWidth * 0.6;
        page.drawLine({ start: { x: MARGIN_LEFT + bankBoxWidth + totalLabelW, y }, end: { x: MARGIN_LEFT + bankBoxWidth + totalLabelW, y: y - summaryHeight }, thickness: 1, color: rgb(0,0,0) });

        for (let i = 1; i < 5; i++) {
            page.drawLine({ start: { x: MARGIN_LEFT + bankBoxWidth, y: y - i * 20 }, end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: y - i * 20 }, thickness: 1, color: rgb(0,0,0) });
        }

        drawTaxRow(y, "TAXABLE AMOUNT", formatIndianCurrency(taxableAmount), true);
        drawTaxRow(y - 20, `CGST ${quote.cgst || 9}%`, formatIndianCurrency(cgstAmt));
        drawTaxRow(y - 40, `SGST ${quote.sgst || 9}%`, formatIndianCurrency(sgstAmt));
        drawTaxRow(y - 60, `IGST ${quote.igst || 0}%`, formatIndianCurrency(igstAmt));
        drawTaxRow(y - 80, "TOTAL", formatIndianCurrency(grandTotal), true);
    } else {
        const contText = "Continued on next page...";
        page.drawText(contText, { x: MARGIN_LEFT + bankBoxWidth + (totalsBoxWidth - font.widthOfTextAtSize(contText, 10))/2, y: y - summaryHeight / 2 - 5, size: 10, font: font });
    }

    y -= summaryHeight;

    // Spacing
    y -= 15;

    // 8. Terms & Conditions
    const termsHeight = 110;
    page.drawRectangle({ x: MARGIN_LEFT, y: y - termsHeight, width: CONTENT_WIDTH, height: termsHeight, borderColor: rgb(0,0,0), borderWidth: 1 });
    page.drawLine({ start: { x: MARGIN_LEFT + bankBoxWidth, y }, end: { x: MARGIN_LEFT + bankBoxWidth, y: y - termsHeight }, thickness: 1, color: rgb(0,0,0) });
    
    // Left side terms header
    page.drawRectangle({ x: MARGIN_LEFT, y: y - 20, width: bankBoxWidth, height: 20, borderColor: rgb(0,0,0), borderWidth: 1 });
    page.drawText("TERMS & CONDITIONS", { x: MARGIN_LEFT + 5, y: y - 14, size: 10, font: font });

    let termsLines = (settings?.termsAndConditions || "").split('\n').filter(Boolean);
    if (termsLines.length === 0) {
      termsLines = [
        "Order To Be Release on PHOENIX TOOLINGS.",
        "Prices are net ex.works ch. Sambhaji Nagar, packing & forwarding extra.",
        "Payment terms- 100% Advance along with Purchase order.",
        "Delivery terms- 2 Week From The Date Of Order.",
        "Validity Of Quotation- 30 Days"
      ];
    }

    let termY = y - 20;
    const termRowH = 90 / 5; // 18
    for (let i = 0; i < 5; i++) {
        // (Horizontal and vertical lines removed as per user request)

        
        page.drawText((i+1).toString(), { x: MARGIN_LEFT + 10, y: termY - 12, size: 9, font: font });
        const termText = termsLines[i] || "";
        page.drawText(termText.substring(0, 70), { x: MARGIN_LEFT + 30, y: termY - 12, size: 9, font: font });
        
        termY -= termRowH;
    }

    // Right side sign
    const signX = MARGIN_LEFT + bankBoxWidth;
    const forText = "FOR, ";
    const companyNameText = settings?.companyName || 'PHOENIX TOOLINGS';
    const forWidth = font.widthOfTextAtSize(forText, 10);
    const companyWidth = boldFont.widthOfTextAtSize(companyNameText, 10);
    const totalTitleWidth = forWidth + companyWidth;
    
    const titleStartX = signX + (totalsBoxWidth - totalTitleWidth) / 2;
    page.drawText(forText, { x: titleStartX, y: y - 15, size: 10, font: font });
    page.drawText(companyNameText, { x: titleStartX + forWidth, y: y - 15, size: 10, font: boldFont });
    
    // Embed stamp image
    try {
      const stampPath = path.join(process.cwd(), 'public', 'company-stamp.jpg');
      if (fs.existsSync(stampPath)) {
        const stampBytes = fs.readFileSync(stampPath);
        const stampImage = await pdfDoc.embedJpg(stampBytes);
        const stampDims = stampImage.scaleToFit(130, 65);
        const stampDrawX = signX + totalsBoxWidth - stampDims.width - 5;
        const stampDrawY = y - termsHeight + 22;
        page.drawImage(stampImage, {
          x: stampDrawX,
          y: stampDrawY,
          width: stampDims.width,
          height: stampDims.height,
        });
      }
    } catch (e) {
      console.error('Failed to embed stamp image:', e);
    }

    page.drawLine({ start: { x: signX, y: y - termsHeight + 20 }, end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: y - termsHeight + 20 }, thickness: 1, color: rgb(0,0,0) });
    const signText = "Authorised Signatory";
    page.drawText(signText, { x: signX + (totalsBoxWidth - font.widthOfTextAtSize(signText, 10))/2, y: y - termsHeight + 6, size: 10, font: font });

    y -= termsHeight;

    // 9. Footer Text
    y -= 15;
    const fText1 = "This is a system generated Quotation";
    const fText2 = "SUBJECTED TO CH. SAMBHAJI NAGAR JURISDICTION";
    page.drawText(fText1, { x: MARGIN_LEFT + (CONTENT_WIDTH - font.widthOfTextAtSize(fText1, 8))/2, y, size: 8, font: font });
    page.drawText(fText2, { x: MARGIN_LEFT + (CONTENT_WIDTH - font.widthOfTextAtSize(fText2, 8))/2, y: y - 12, size: 8, font: font });
    } // End of page loop

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
