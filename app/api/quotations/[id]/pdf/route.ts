import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PDFDocument, rgb, StandardFonts, PDFImage, PageSizes } from 'pdf-lib';
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

function hexColor(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
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
      letterheadBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'letterHead.png'));
    } catch (e) { }

    let letterheadImage: any;
    if (letterheadBytes) {
      letterheadImage = await pdfDoc.embedPng(letterheadBytes);
    }

    let headerLogoBytes;
    try {
      headerLogoBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'headerLogo.png'));
    } catch (e) { }

    let headerLogoImage: any;
    if (headerLogoBytes) {
      headerLogoImage = await pdfDoc.embedPng(headerLogoBytes);
    }

    // Footer text is drawn dynamically, no image needed
    let partnersBytes;
    try {
      const partnersPath = path.join(process.cwd(), 'public', 'partners.jpg');
      partnersBytes = fs.readFileSync(partnersPath);
    } catch (e) {
      try {
        const partnersPathPng = path.join(process.cwd(), 'public', 'partners.png');
        partnersBytes = fs.readFileSync(partnersPathPng);
      } catch (e2) { }
    }

    let partnersImage: any;
    if (partnersBytes) {
      try {
        partnersImage = await pdfDoc.embedJpg(partnersBytes);
      } catch (e) {
        try {
          partnersImage = await pdfDoc.embedPng(partnersBytes);
        } catch (e2) { }
      }
    }

    const [A4_WIDTH, A4_HEIGHT] = PageSizes.A4;

    // Standard margins for decoupled header and footer images
    const CONTENT_WIDTH = 550; // Reduced width to avoid right red banner
    const MARGIN_LEFT = 10;
    const TOP_MARGIN = A4_HEIGHT - 105; // Moved up to reduce whitespace

    // Global Totals Calculation
    let globalSubtotal = 0;
    for (const item of quote.items) {
      const itemDiscount = item.discount || 0;
      const netPrice = item.price * (1 - itemDiscount / 100);
      globalSubtotal += netPrice * item.quantity;
    }
    const discountAmount = globalSubtotal * ((quote.discount || 0) / 100);
    const taxableAmount = globalSubtotal - discountAmount;
    const gstAmt = taxableAmount * 0.18;
    const grandTotal = taxableAmount + gstAmt;

    const chunks = [];
    if (quote.items.length === 0) chunks.push([]);
    const ITEMS_PER_PAGE = 10;
    for (let i = 0; i < quote.items.length; i += ITEMS_PER_PAGE) {
      chunks.push(quote.items.slice(i, i + ITEMS_PER_PAGE));
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
        if (headerLogoImage) {
          const dims = headerLogoImage.scaleToFit(200, 80);
          page.drawImage(headerLogoImage, {
            x: MARGIN_LEFT + CONTENT_WIDTH - dims.width, // Align with right side of the table
            y: A4_HEIGHT - dims.height - 15,
            width: dims.width,
            height: dims.height,
          });
        }


      };

      addBackground();

      const drawGridCell = (text: string, x: number, yPos: number, w: number, h: number, f: any, size: number, align: 'left' | 'center' | 'right' = 'left', drawBox = true) => {
        if (drawBox) {
          page.drawRectangle({ x, y: yPos - h, width: w, height: h, borderColor: rgb(0, 0, 0), borderWidth: 1 });
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
      const quotationTitleStr = "QUOTATION";
      const quotationTitleWidth = boldFont.widthOfTextAtSize(quotationTitleStr, 14);
      page.drawText(quotationTitleStr, {
        x: MARGIN_LEFT + (CONTENT_WIDTH - quotationTitleWidth) / 2,
        y: A4_HEIGHT - 20,
        size: 14,
        font: boldFont
      });

      // Company info lines below QUOTATION title
      const rawAddress = (settings?.address || "A-51 MIDC WALUJ, AURANGABAD - 431 136, MAHARASTRA, INDIA.").toUpperCase();
      let addressLines: string[] = [];
      if (rawAddress.includes('\n')) {
        addressLines = rawAddress.split('\n').map((s: string) => s.trim()).filter(Boolean);
      } else {
        const commaParts = rawAddress.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (commaParts.length >= 2) {
          let line1 = commaParts[0];
          let splitIdx = 1;
          for (let i = 1; i < commaParts.length - 1; i++) {
            if ((line1 + ", " + commaParts[i]).length <= 40) {
              line1 += ", " + commaParts[i];
              splitIdx = i + 1;
            } else {
              break;
            }
          }
          addressLines = [
            line1 + ",",
            commaParts.slice(splitIdx).join(', ')
          ];
        } else {
          const words = rawAddress.split(' ');
          const mid = Math.ceil(words.length / 2);
          addressLines = [
            words.slice(0, mid).join(' '),
            words.slice(mid).join(' ')
          ];
        }
      }

      const infoFontSize = 8;
      let infoY = A4_HEIGHT - 60;
      const infoStartX = MARGIN_LEFT + 15;
      const labelColor = hexColor('#D51947');

      // Separate labels, colons, and values into aligned columns
      const worksText = "WORKS";
      const callText = "CALL";
      const emailText = "E-mail";

      const maxLabelTextWidth = Math.max(
        boldFont.widthOfTextAtSize(worksText, infoFontSize),
        boldFont.widthOfTextAtSize(callText, infoFontSize),
        boldFont.widthOfTextAtSize(emailText, infoFontSize)
      );

      const colonX = infoStartX + maxLabelTextWidth + 8;
      const valueX = colonX + boldFont.widthOfTextAtSize(":", infoFontSize) + 8;

      // Draw WORKS
      page.drawText(worksText, { x: infoStartX, y: infoY, size: infoFontSize, font: boldFont, color: labelColor });
      page.drawText(":", { x: colonX, y: infoY, size: infoFontSize, font: boldFont, color: labelColor });
      page.drawText(addressLines[0] || '', { x: valueX, y: infoY, size: infoFontSize, font: boldFont });
      infoY -= 12;

      for (let i = 1; i < addressLines.length; i++) {
        page.drawText(addressLines[i], { x: valueX, y: infoY, size: infoFontSize, font: boldFont });
        infoY -= 12;
      }

      // Draw CALL
      const callValue = settings?.phone || "+91 9890448625 / +91 9766791555";
      page.drawText(callText, { x: infoStartX, y: infoY, size: infoFontSize, font: boldFont, color: labelColor });
      page.drawText(":", { x: colonX, y: infoY, size: infoFontSize, font: boldFont, color: labelColor });
      page.drawText(callValue, { x: valueX, y: infoY, size: infoFontSize, font: boldFont });
      infoY -= 12;

      // Draw E-mail
      const emailValue = settings?.email || "gbs@phoenixtoolings.com / mayur@phoenixtoolings.com";
      page.drawText(emailText, { x: infoStartX, y: infoY, size: infoFontSize, font: boldFont, color: labelColor });
      page.drawText(":", { x: colonX, y: infoY, size: infoFontSize, font: boldFont, color: labelColor });
      page.drawText(emailValue, { x: valueX, y: infoY, size: infoFontSize, font: boldFont });

      // 2. Info Block
      const leftWidth = CONTENT_WIDTH * 0.61;
      const rightWidth = CONTENT_WIDTH - leftWidth;
      const row2Height = 80;

      // Draw outer box for the info block
      page.drawRectangle({ x: MARGIN_LEFT, y: y - row2Height, width: CONTENT_WIDTH, height: row2Height, borderColor: rgb(0, 0, 0), borderWidth: 1 });
      page.drawLine({ start: { x: MARGIN_LEFT + leftWidth, y }, end: { x: MARGIN_LEFT + leftWidth, y: y - row2Height }, thickness: 1, color: rgb(0, 0, 0) });

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

      const rightLabels = ["QUOTATION NO.", "DATE", "REF NO.", "REF DATE."];
      const maxRightLabelWidth = Math.max(...rightLabels.map((l: string) => font.widthOfTextAtSize(l, 9)));
      const rightColonX = rightX + 3 + maxRightLabelWidth + 8;
      const rightValueX = rightColonX + font.widthOfTextAtSize(":", 9) + 12;

      const drawRightCell = (label: string, val: string, index: number) => {
        const rowY = y - index * rightRowH;
        page.drawText(label, { x: rightX + 3, y: rowY - 13, size: 9, font: font });
        page.drawText(":", { x: rightColonX, y: rowY - 13, size: 9, font: font });
        if (val) {
          page.drawText(val, { x: rightValueX, y: rowY - 13, size: 9, font: font });
        }
      }

      drawRightCell("QUOTATION NO.", quote.quoteNumber, 0);
      drawRightCell("DATE", qtnDate, 1);
      drawRightCell("REF NO.", quote.refNumber || "AS PER VISIT", 2);
      drawRightCell("REF DATE.", refDate, 3);

      y -= row2Height;

      // 3. KIND ATTN
      const row3Height = 20;
      page.drawRectangle({ x: MARGIN_LEFT, y: y - row3Height, width: CONTENT_WIDTH, height: row3Height, borderColor: rgb(0, 0, 0), borderWidth: 1 });
      page.drawText(`KIND ATTN : ${quote.contactPerson || ''}`, { x: MARGIN_LEFT + 5, y: y - 13, size: 9, font: font });
      y -= row3Height;

      // 4. Reference
      const row4Height = 20;
      drawGridCell("With Reference to your enquiry we are submitting our quotation as follows", MARGIN_LEFT, y, CONTENT_WIDTH, row4Height, font, 9, 'center', false);
      y -= row4Height;

      // 5. Table Header
      const headerHeight = 18;
      const headers = ["ITEM NO.", "DESCRIPTION", "MAKE", "DRG. NO.", "QTY", "PRICE", "DISC.", "NET PRICE", "TOTAL"];
      const colWidths = [70, 135, 65, 50, 30, 55, 35, 55, 55]; // Sum is exactly 550
      let curX = MARGIN_LEFT;
      for (let i = 0; i < headers.length; i++) {
        drawGridCell(headers[i], curX, y, colWidths[i], headerHeight, boldFont, 8, 'center');
        curX += colWidths[i];
      }
      y -= headerHeight;

      const numRows = ITEMS_PER_PAGE;
      const rowHeight = 28; // Decreased from 32 to prevent terms box from overlapping footer
      const tableBodyHeight = numRows * rowHeight;

      // Draw outer rectangle for the whole table body and vertical column lines
      page.drawRectangle({ x: MARGIN_LEFT, y: y - tableBodyHeight, width: CONTENT_WIDTH, height: tableBodyHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });
      let vertX = MARGIN_LEFT;
      for (let j = 0; j < colWidths.length - 1; j++) {
        vertX += colWidths[j];
        page.drawLine({ start: { x: vertX, y: y }, end: { x: vertX, y: y - tableBodyHeight }, thickness: 1, color: rgb(0, 0, 0) });
      }

      for (let i = 0; i < numRows; i++) {
        const item = currentChunk[i];
        let rowTexts = ["", "", "", "", "", "", "", ""];

        if (item) {
          const itemDiscount = item.discount || 0;
          const netPrice = item.price * (1 - itemDiscount / 100);
          const amount = netPrice * item.quantity;
          rowTexts = [
            item.itemNumber || "",
            item.name || "",
            item.make ? item.make.toUpperCase() : "",
            item.drgNumber || "",
            item.quantity.toString(),
            formatIndianCurrency(item.price),
            itemDiscount > 0 ? `${itemDiscount}%` : "",
            formatIndianCurrency(netPrice),
            formatIndianCurrency(amount)
          ];
        }

        let curRowX = MARGIN_LEFT;
        for (let j = 0; j < colWidths.length; j++) {
          if (rowTexts[j]) {
            let align: 'left' | 'center' | 'right' = 'left';
            if (j === 0 || j === 2 || j === 3 || j === 4 || j === 6) align = 'center';
            if (j === 5 || j === 7 || j === 8) align = 'right';

            const breakText = (str: string, maxW: number) => {
              const res = [];
              let cur = "";
              for (let charIndex = 0; charIndex < str.length; charIndex++) {
                if (font.widthOfTextAtSize(cur + str[charIndex], 9) > maxW) {
                  const lastSpace = cur.lastIndexOf(' ');
                  if (lastSpace > 0 && lastSpace > cur.length / 2) {
                    res.push(cur.substring(0, lastSpace).trim());
                    cur = cur.substring(lastSpace + 1) + str[charIndex];
                  } else {
                    res.push(cur.trim());
                    cur = str[charIndex];
                  }
                } else {
                  cur += str[charIndex];
                }
              }
              if (cur.trim()) res.push(cur.trim());
              return res;
            };

            const lines = breakText(rowTexts[j], colWidths[j] - 6);

            let textY = y - 12;
            for (const l of lines) {
              const tWidth = font.widthOfTextAtSize(l, 9);
              let textX = curRowX + 3;
              if (align === 'center') textX = curRowX + (colWidths[j] - tWidth) / 2;
              if (align === 'right') textX = curRowX + colWidths[j] - tWidth - 3;

              page.drawText(l, { x: textX, y: textY, size: 9, font: font });
              textY -= 10; // offset for next line
            }
          }
          curRowX += colWidths[j];
        }
        y -= rowHeight;
      }

      // 7. Bank Details & Totals
      const bankBoxWidth = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];
      const totalsBoxWidth = CONTENT_WIDTH - bankBoxWidth;
      const summaryHeight = 60;

      const isLastPage = pageIndex === chunks.length - 1;

      // Draw outer summary box
      page.drawRectangle({ x: MARGIN_LEFT, y: y - summaryHeight, width: CONTENT_WIDTH, height: summaryHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });
      page.drawLine({ start: { x: MARGIN_LEFT + bankBoxWidth, y }, end: { x: MARGIN_LEFT + bankBoxWidth, y: y - summaryHeight }, thickness: 1, color: rgb(0, 0, 0) });

      const bankPad = MARGIN_LEFT + 5;
      const gstStr = `GST NO-${settings?.gstNumber || '27AFWPG3321F1ZH'}`;
      page.drawText(gstStr, { x: bankPad, y: y - 44, size: 12, font: boldFont });

      const drawTaxRow = (rowY: number, label: string, amountStr: string, isBold = false, labelColor?: any) => {
        const f = isBold ? boldFont : font;
        const opts1: any = { x: MARGIN_LEFT + bankBoxWidth + 3, y: rowY - 14, size: 9, font: f };
        if (labelColor) opts1.color = labelColor;
        page.drawText(label, opts1);

        const w = f.widthOfTextAtSize(amountStr, 9);
        const opts2: any = { x: MARGIN_LEFT + CONTENT_WIDTH - w - 3, y: rowY - 14, size: 9, font: f };
        page.drawText(amountStr, opts2);
      };

      if (isLastPage) {
        const totalLabelW = colWidths[6] + colWidths[7];
        page.drawLine({ start: { x: MARGIN_LEFT + bankBoxWidth + totalLabelW, y }, end: { x: MARGIN_LEFT + bankBoxWidth + totalLabelW, y: y - summaryHeight }, thickness: 1, color: rgb(0, 0, 0) });

        page.drawLine({ start: { x: MARGIN_LEFT + bankBoxWidth, y: y - 20 }, end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: y - 20 }, thickness: 1, color: rgb(0, 0, 0) });
        page.drawLine({ start: { x: MARGIN_LEFT + bankBoxWidth, y: y - 40 }, end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: y - 40 }, thickness: 1, color: rgb(0, 0, 0) });

        drawTaxRow(y, "TAXABLE AMOUNT", formatIndianCurrency(taxableAmount), true);
        drawTaxRow(y - 20, "GST 18%", formatIndianCurrency(gstAmt));
        drawTaxRow(y - 40, "TOTAL", formatIndianCurrency(grandTotal), true, labelColor);
      } else {
        const contText = "Continued on next page...";
        page.drawText(contText, { x: MARGIN_LEFT + bankBoxWidth + (totalsBoxWidth - font.widthOfTextAtSize(contText, 10)) / 2, y: y - summaryHeight / 2 - 5, size: 10, font: font });
      }

      y -= summaryHeight;

      // Spacing
      y -= 15;

      // 8. Terms & Conditions
      const termsHeight = 140;
      page.drawRectangle({ x: MARGIN_LEFT, y: y - termsHeight, width: CONTENT_WIDTH, height: termsHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });
      page.drawLine({ start: { x: MARGIN_LEFT + bankBoxWidth, y }, end: { x: MARGIN_LEFT + bankBoxWidth, y: y - termsHeight }, thickness: 1, color: rgb(0, 0, 0) });

      // Left side terms header
      page.drawRectangle({ x: MARGIN_LEFT, y: y - 20, width: bankBoxWidth, height: 20, borderColor: rgb(0, 0, 0), borderWidth: 1 });
      page.drawText("Terms and Condition :", { x: MARGIN_LEFT + 5, y: y - 14, size: 10, font: boldFont });

      const defaultTerms = [
        { label: "1) GST", value: ": 18%" },
        { label: "2) Delivery", value: ": Two Weeks from the date of receipt of purchase order" },
        { label: "3) Payment", value: ": 100% Against Proforma" },
        { label: "4) Validity", value: ": 1 Week" },
        { label: "5) P & F Extra", value: ": NA" },
        { label: "6) Insurance", value: ": At your end" },
        { label: "7) Note", value: ": 18% interest will be charged on the value of invoice, If not paid within 30 days from the date of invoice." },
      ];

      let structuredTerms: { label: string; value: string }[] = [];
      const rawTerms = (settings?.termsAndConditions || "").split('\n').filter(Boolean);
      for (const line of rawTerms) {
        const match = line.match(/^(\d+\)\s*[^:]+)\s*:\s*(.*)$/);
        if (match) {
          structuredTerms.push({ label: match[1].trim(), value: ": " + match[2].trim() });
        }
      }
      if (structuredTerms.length === 0) {
        structuredTerms = defaultTerms;
      }

      const termLabelX = MARGIN_LEFT + 5;
      const termValueX = MARGIN_LEFT + 105;
      let termY = y - 20;
      const termRowH = 15;
      for (const term of structuredTerms) {
        page.drawText(term.label, { x: termLabelX, y: termY - 12, size: 9, font: boldFont, color: labelColor });
        // Check if value needs to wrap
        const maxValueWidth = bankBoxWidth - 115;
        if (font.widthOfTextAtSize(term.value, 9) > maxValueWidth) {
          const colonOffset = font.widthOfTextAtSize(": ", 9);
          let line1 = "";
          for (let c = 0; c < term.value.length; c++) {
            if (font.widthOfTextAtSize(line1 + term.value[c], 9) > maxValueWidth) {
              const lastSpace = line1.lastIndexOf(' ');
              if (lastSpace > 0) {
                page.drawText(line1.substring(0, lastSpace), { x: termValueX, y: termY - 12, size: 9, font: font });
                termY -= termRowH;
                page.drawText(line1.substring(lastSpace + 1) + term.value.substring(c), { x: termValueX + colonOffset, y: termY - 12, size: 9, font: font });
              } else {
                page.drawText(line1, { x: termValueX, y: termY - 12, size: 9, font: font });
                termY -= termRowH;
                page.drawText(term.value.substring(c), { x: termValueX + colonOffset, y: termY - 12, size: 9, font: font });
              }
              break;
            }
            line1 += term.value[c];
            if (c === term.value.length - 1) {
              page.drawText(line1, { x: termValueX, y: termY - 12, size: 9, font: font });
            }
          }
        } else {
          page.drawText(term.value, { x: termValueX, y: termY - 12, size: 9, font: font });
        }
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

      page.drawLine({ start: { x: signX, y: y - termsHeight + 20 }, end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: y - termsHeight + 20 }, thickness: 1, color: rgb(0, 0, 0) });
      const signText = "Authorised Signatory";
      page.drawText(signText, { x: signX + (totalsBoxWidth - font.widthOfTextAtSize(signText, 10)) / 2, y: y - termsHeight + 6, size: 10, font: font });

      y -= termsHeight;

      // 9. Hope Text
      y -= 15;
      const hopeText = "We hope you find the above quotation attractive and look forward to receiving your valuable order.";
      page.drawText(hopeText, {
        x: MARGIN_LEFT + (CONTENT_WIDTH - boldFont.widthOfTextAtSize(hopeText, 9)) / 2,
        y: y,
        size: 9,
        font: boldFont
      });

      // 10. Authorized Channel Partners
      y -= 35;

      const titleStr = "AUTHORIZED CHANNEL PARTNER";
      page.drawText(titleStr, { x: MARGIN_LEFT, y, size: 9, font: boldFont });
      page.drawLine({ start: { x: MARGIN_LEFT, y: y - 2 }, end: { x: MARGIN_LEFT + boldFont.widthOfTextAtSize(titleStr, 9), y: y - 2 }, thickness: 1, color: rgb(0, 0, 0) });
      y -= 10;

      if (partnersImage) {
        const pDims = partnersImage.scaleToFit(CONTENT_WIDTH, 35);
        page.drawImage(partnersImage, {
          x: MARGIN_LEFT,
          y: y - pDims.height,
          width: pDims.width,
          height: pDims.height,
        });
      } else {
        const partnersText = "ISCAR   |   CTC PRECISION   |   REGO-FIX   |   HNTI OIL   |   ADDISON";
        page.drawText(partnersText, { x: MARGIN_LEFT, y: y - 10, size: 10, font: boldFont });
      }

    } // End of page loop

    const pdfBytes = await pdfDoc.save();

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quote.quoteNumber}.pdf"`,
      },
    });

  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
