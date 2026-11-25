export interface TermItem {
  id: string;
  label: string;
  value: string;
}

export const DEFAULT_TERMS_TEXT = [
  '1) GST : 18%',
  '2) Delivery : Two Weeks from the date of receipt of purchase order',
  '3) Payment : 100% Against Proforma',
  '4) Validity : 1 Week',
  '5) P & F Extra : NA',
  '6) Insurance : At your end',
  '7) Note : 18% interest will be charged on the value of invoice, If not paid within 30 days from the date of invoice.',
].join('\n');

let termIdCounter = 0;
export function createTermId(): string {
  termIdCounter += 1;
  return `term-${Date.now()}-${termIdCounter}`;
}

/**
 * Parse multiline "1) Label : Value" terms text into structured TermItem rows.
 */
export function parseTermsText(rawText?: string | null): TermItem[] {
  const source = rawText && rawText.trim().length > 0 ? rawText : DEFAULT_TERMS_TEXT;
  const lines = source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const items: TermItem[] = [];
  for (const line of lines) {
    // Strip optional leading numbering like "1) " or "1. "
    const withoutPrefix = line.replace(/^\d+[\)\.]\s*/, '');
    const colonIdx = withoutPrefix.indexOf(':');
    if (colonIdx !== -1) {
      const label = withoutPrefix.slice(0, colonIdx).trim();
      const value = withoutPrefix.slice(colonIdx + 1).trim();
      if (label || value) {
        items.push({ id: createTermId(), label, value });
      }
    } else {
      items.push({ id: createTermId(), label: 'Note', value: withoutPrefix });
    }
  }

  return items.length > 0 ? items : parseTermsText(DEFAULT_TERMS_TEXT);
}

/**
 * Serialize structured TermItem rows back into numbered "1) Label : Value" text.
 */
export function serializeTerms(items: TermItem[]): string {
  const nonEmpty = items.filter((t) => t.label.trim() || t.value.trim());
  return nonEmpty
    .map((t, index) => {
      const cleanLabel = t.label.trim().replace(/^\d+[\)\.]\s*/, '') || 'Term';
      const cleanValue = t.value.trim();
      return `${index + 1}) ${cleanLabel} : ${cleanValue}`;
    })
    .join('\n');
}
