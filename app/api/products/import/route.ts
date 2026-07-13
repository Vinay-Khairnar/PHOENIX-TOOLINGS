import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
  articleNumber: ['article', 'art', 'part', 'tool no'],
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
  const articleCol = findColumnIndex(headers, COLUMN_MAP.articleNumber);
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
    const articleNumber = articleCol >= 0 ? row[articleCol] : undefined;
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
      articleNumber:
        articleNumber != null && String(articleNumber).trim()
          ? String(articleNumber).trim()
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    let rows: any[][] = [];

    if (isExcel) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Read all rows as raw arrays (no header assumption)
      rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    } else {
      const csvText = await file.text();
      const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: true });
      rows = parsed.data as any[][];
    }

    // Since the price list changes WRT years, we replace the entire price list
    await prisma.product.deleteMany({});

    const { items: validItems, skipped } = processRawRows(rows);

    // Insert in batches of 1000
    const BATCH_SIZE = 1000;
    for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
      const batch = validItems.slice(i, i + BATCH_SIZE);
      await prisma.product.createMany({ data: batch });
    }

    return NextResponse.json({
      message: `Imported ${validItems.length} products`,
      skipped,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to import products' },
      { status: 500 }
    );
  }
}
