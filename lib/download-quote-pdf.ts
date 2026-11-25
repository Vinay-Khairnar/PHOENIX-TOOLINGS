import type { QuotationPdfInput } from '@/lib/quotation-pdf';

export async function downloadSavedQuotePdf(
  quoteId: string,
  quoteNumber: string,
  fallbackPayload?: QuotationPdfInput,
  termsColumnMissing?: boolean
): Promise<boolean> {
  try {
    let pdfRes: Response;
    if (termsColumnMissing && fallbackPayload) {
      pdfRes = await fetch('/api/quotations/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackPayload),
      });
    } else {
      pdfRes = await fetch(`/api/quotations/${quoteId}/pdf`);
    }

    if (!pdfRes.ok) return false;

    const blob = await pdfRes.blob();
    const url = window.URL.createObjectURL(blob);
    const safeQuoteNumber = (quoteNumber || 'Quotation').replace(/\//g, '∕');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeQuoteNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error('Failed to download PDF:', err);
    return false;
  }
}
