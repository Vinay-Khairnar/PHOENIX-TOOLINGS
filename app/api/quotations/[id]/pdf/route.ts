import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateQuotationPdf } from '@/lib/quotation-pdf';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    if (quoteError || !quoteRaw) {
      return new NextResponse('Quote not found', { status: 404 });
    }

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

    const pdfBytes = await generateQuotationPdf(quote, settings);

    const safeFilename = (quote.quoteNumber || 'Quotation').replace(/\//g, '/');
    const encodedFilename = encodeURIComponent(`${safeFilename}.pdf`);
    const fallbackAscii = (quote.quoteNumber || 'Quotation').replace(/[^a-zA-Z0-9._-]/g, '_') + '.pdf';

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fallbackAscii}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
