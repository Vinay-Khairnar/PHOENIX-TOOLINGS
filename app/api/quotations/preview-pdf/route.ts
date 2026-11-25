import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateQuotationPdf } from '@/lib/quotation-pdf';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data: settings } = await supabase
      .from('Settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    const pdfBytes = await generateQuotationPdf(
      {
        quoteNumber: body.quoteNumber || '',
        createdAt: body.createdAt || null,
        quoteDate: body.quoteDate || null,
        refNumber: body.refNumber || null,
        refDate: body.refDate || null,
        customerName: body.customerName || '',
        customerAddress: body.customerAddress || null,
        contactPerson: body.contactPerson || null,
        discount: Number(body.discount) || 0,
        termsAndConditions: typeof body.termsAndConditions === 'string' ? body.termsAndConditions : null,
        items: Array.isArray(body.items) ? body.items : [],
      },
      settings
    );

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="quotation-preview.pdf"',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Quotation preview PDF error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF preview' }, { status: 500 });
  }
}
