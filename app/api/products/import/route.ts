import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import * as xlsx from 'xlsx';

// --- Header Detection ---

// Keyword categories for identifying header rows
const HEADER_INDICATORS: Record<string, string[]> = {
  name: ['description', 'material', 'item', 'product', 'article', 'title', 'name'],
  price: ['price', 'rate', 'cost', 'amount', 'value', 'gross'],
  quantity: ['qty', 'quantity', 'ordered'],
  id: ['sr', 'serial', 'no', 'number'],
};

// Column mapping keywords (searched against the detected header values)
const COLUMN_MAP: Record<string, string[]> = {
  name: ['material', 'description', 'product', 'item', 'title', 'name'],
  price: ['price', 'rate', 'cost', 'amount', 'value', 'gross price', 'agreed rate'],
  sku: ['sku', 'code', 'cat', 'catalogue', 'catalog'],
  itemNumber: ['article', 'art', 'part', 'tool no'],
  description: ['grade', 'detail', 'info', 'spec'],
};

/**
 * Checks if a row contains recognizable header keywords from at least 2 categories.
 */
function isHeaderRow(row: any[]): boolean {
  const matchedCategories = new Set<string>();
  for (const cell of row) {
    if (cell == null) continue;
    const cellStr = String(cell).toLowerCase().trim();
    if (!cellStr) continue;
    for (const [category, keywords] of Object.entries(HEADER_INDICATORS)) {
      if (keywords.some((kw) => cellStr.includes(kw))) {
        matchedCategories.add(category);
      }
    }
  }
  return matchedCategories.size >= 2;
}

/**
 * Scans the first 20 rows to find the header row index.
 * Returns -1 if no header row is found.
 */
function findHeaderRowIndex(rows: any[][]): number {
  const scanLimit = Math.min(rows.length, 21);
  for (let i = 0; i < scanLimit; i++) {
    if (rows[i] && isHeaderRow(rows[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * Given a header row, finds the column index whose header best matches the given search terms.
 * Prefers longer keyword matches (e.g. "agreed rate" over "rate").
 */
function findColumnIndex(headers: string[], searchTerms: string[]): number {
  let bestIndex = -1;
  let bestKeywordLength = 0;

  for (let i = 0; i < headers.length; i++) {
    const header = (headers[i] || '').toLowerCase().trim();
    if (!header) continue;
    for (const term of searchTerms) {
      if (header.includes(term) && term.length > bestKeywordLength) {
        bestIndex = i;
        bestKeywordLength = term.length;
      }
    }
  }
  return bestIndex;
}

/**
 * Cleans a price string by removing currency symbols, commas, and other non-numeric chars.
 */
function cleanPrice(raw: any): number {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/[^0-9.\-]+/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Processes raw row arrays (from xlsx or CSV) into product objects using smart header detection.
 */
function processRawRows(rows: any[][]): { items: any[]; skipped: number } {
  const headerIndex = findHeaderRowIndex(rows);

  if (headerIndex === -1) {
    // Fallback: assume row 0 is the header
    return processWithHeaderIndex(rows, 0);
  }

  return processWithHeaderIndex(rows, headerIndex);
}

function processWithHeaderIndex(
  rows: any[][],
  headerIndex: number
): { items: any[]; skipped: number } {
  const headerRow = rows[headerIndex];
  if (!headerRow) return { items: [], skipped: 0 };

  // Normalize headers to strings
  const headers = headerRow.map((h) => (h != null ? String(h) : ''));

  // Find column indices for each field
  const nameCol = findColumnIndex(headers, COLUMN_MAP.name);
  const priceCol = findColumnIndex(headers, COLUMN_MAP.price);
  const skuCol = findColumnIndex(headers, COLUMN_MAP.sku);
  const articleCol = findColumnIndex(headers, COLUMN_MAP.itemNumber);
  const descCol = findColumnIndex(headers, COLUMN_MAP.description);

  const items: any[] = [];
  let skipped = 0;

  // Data starts from the row after the header
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) {
      skipped++;
      continue;
    }

    const name = nameCol >= 0 ? row[nameCol] : undefined;
    const priceRaw = priceCol >= 0 ? row[priceCol] : undefined;
    const sku = skuCol >= 0 ? row[skuCol] : undefined;
    const itemNumber = articleCol >= 0 ? row[articleCol] : undefined;
    const description = descCol >= 0 ? row[descCol] : undefined;

    const nameStr = name != null ? String(name).trim() : '';
    const price = cleanPrice(priceRaw);

    // Skip rows where name is empty or price is 0/undefined
    if (!nameStr || price === 0) {
      skipped++;
      continue;
    }

    items.push({
      name: nameStr,
      sku: sku != null && String(sku).trim() ? String(sku).trim() : null,
      itemNumber:
        itemNumber != null && String(itemNumber).trim()
          ? String(itemNumber).trim()
          : null,
      price,
      description:
        description != null && String(description).trim()
          ? String(description).trim()
          : null,
    });
  }

  return { items, skipped };
}

// Cache buster for pdf-parse swap
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const make = formData.get('make') as string;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file uploaded or file is empty' }, { status: 400 });
    }

    if (!make) {
      return NextResponse.json({ error: 'Make is required' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isPdf = file.name.endsWith('.pdf');
    let rows: any[][] = [];
    let validItems: any[] = [];
    let skipped = 0;

    if (isPdf) {
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const pdfBuffer = Buffer.from(buffer);
      
      function pagerender(pageData: any) {
        return pageData.getTextContent({ normalizeWhitespace: true }).then((textContent: any) => {
          const rows: Record<number, Array<{ x: number; str: string }>> = {};
          for (const item of textContent.items) {
            if (!item.str || !item.str.trim()) continue;
            const y = Math.round(item.transform[5] * 2) / 2;
            if (!rows[y]) rows[y] = [];
            rows[y].push({ x: item.transform[4], str: item.str.trim() });
          }
          
          const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
          const lines: string[] = [];
          for (const y of sortedY) {
            const items = rows[y].sort((a, b) => a.x - b.x);
            lines.push(items.map(it => it.str).join('   '));
          }
          return lines.join('\n');
        });
      }

      const data = await pdfParse(pdfBuffer, { pagerender });
      const lines = data.text.split('\n').map((l: string) => l.trim()).filter(Boolean);

      for (const line of lines) {
        if (
          line.includes('GENERAL TERMS') || 
          line.includes('Definitions :') || 
          line.includes('ISCAR LTD stock') || 
          line.includes('Price List') || 
          line.includes('Description Grade') || 
          line.includes('L E G E N D') ||
          line.includes('International standard') ||
          line.includes('Gross Price') ||
          line.includes('Discount-26') ||
          line.includes('Net Price after') ||
          line.includes('Sr. No.   Art.-No.') ||
          /Page\s+\d+\s+of\s+\d+/i.test(line) ||
          /^Page\s+\d+/i.test(line)
        ) {
          continue;
        }

        // 1. REGO-FIX Format: Sr.No | Art-No (e.g. 4230.11630) | Item Name | Gross Price | Discount% | Net Price
        // Example: '1   4230.11630   SK 30 / ER 16 x 070 H   22,163.00   50%   11,082.00'
        const regoMatch = line.match(/^(\d+)\s+([0-9]{4,5}\.[0-9]{4,5}[A-Z0-9]*)\s+(.+?)\s+([\d,]+(?:\.\d{2})?)\s+(?:\d+%)?\s+([\d,]+(?:\.\d{2})?)$/);
        if (regoMatch) {
          const artNo = regoMatch[2].trim();
          const itemName = regoMatch[3].trim();
          const grossPrice = parseFloat(regoMatch[4].replace(/,/g, ''));
          const netPrice = parseFloat(regoMatch[5].replace(/,/g, ''));
          const price = grossPrice > 0 ? grossPrice : netPrice;

          if (itemName && price > 0) {
            validItems.push({
              name: itemName,
              itemNumber: artNo,
              sku: null,
              description: null,
              price,
            });
            continue;
          }
        }

        // 2. ISCAR Dual-Column or Single-Column Format:
        // A line may contain 1 or 2 ISCAR products, each ending with [Cat.Nr (6-8 digits)] [Price]
        // e.g. '06IL 0.50 ISO IC228 3 N1 5901594 2140.00   08IR 1.50 ISO IC908 2 N1 5991115 2240.00'
        const iscarProductRegex = /(.+?)\s+(\d{6,8})\s+([\d,]+(?:\.\d{2})?)(?:\s{3,}|$)/g;
        let iscarMatch: RegExpExecArray | null;
        let foundIscar = false;

        while ((iscarMatch = iscarProductRegex.exec(line)) !== null) {
          const prefix = iscarMatch[1].trim();
          const catNr = iscarMatch[2].trim();
          const price = parseFloat(iscarMatch[3].replace(/,/g, ''));

          if (prefix && price > 0 && prefix.length < 80) {
            const cleanedName = prefix
              .replace(/\s+\d\s+[A-Z0-9]{1,4}$/i, '')
              .replace(/\s+[A-Z0-9]{1,4}$/i, '')
              .trim();

            validItems.push({
              name: cleanedName || prefix,
              itemNumber: catNr,
              sku: null,
              description: null,
              price,
            });
            foundIscar = true;
          }
        }
        if (foundIscar) continue;

        // 3. Standard Tabular Format: [Sr.No] [Art.No/ItemNo] [Description] [Price]
        const stdMatch = line.match(/^(\d+)\s+(\S+)\s+(.+?)\s+([\d,]+(?:\.\d{2})?)$/);
        if (stdMatch) {
          const artNo = stdMatch[2].trim();
          const itemName = stdMatch[3].trim();
          const price = parseFloat(stdMatch[4].replace(/,/g, ''));
          if (itemName && !isNaN(price) && price > 0) {
            validItems.push({
              name: itemName,
              itemNumber: artNo,
              sku: null,
              description: null,
              price,
            });
            continue;
          }
        }

        skipped++;
      }
    } else {
      if (isExcel) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      } else {
        const csvText = await file.text();
        const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: true });
        rows = parsed.data as any[][];
      }
      
      const processed = processRawRows(rows);
      validItems = processed.items;
      skipped = processed.skipped;
    }

    // Products will now be appended. Users can use the 'Delete All' button in the UI if they want to wipe the list before importing.

    if (make) {
      validItems = validItems.map(item => ({ ...item, make: make.toUpperCase() }));
    }

    // Insert in batches of 1000
    const BATCH_SIZE = 1000;
    for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
      const batch = validItems.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('Product').insert(batch);
      if (error) throw error;
    }

    return NextResponse.json({
      message: `Imported ${validItems.length} products`,
      skipped,
    });
  } catch (error) {
    console.error(error);
    try {
      const errorStr = error instanceof Error ? error.stack : JSON.stringify(error);
      require('fs').writeFileSync('/tmp/import-error.log', String(errorStr));
    } catch(e) {}
    return NextResponse.json(
      { error: 'Failed to import products', details: error instanceof Error ? error.message : JSON.stringify(error), stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
