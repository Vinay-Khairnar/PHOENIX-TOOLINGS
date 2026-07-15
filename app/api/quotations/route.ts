import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: quotes, error } = await supabase
      .from('Quote')
      .select('*, Customer(*), items:QuoteItem(*)')
      .order('createdAt', { ascending: false });
      
    if (error) throw error;

    // Map Customer fields back to the quote object for the UI
    const mappedQuotes = quotes.map(q => ({
      ...q,
      customerName: q.Customer?.name,
      customerEmail: q.Customer?.email,
      customerPhone: q.Customer?.phone,
      customerAddress: q.Customer?.address,
    }));

    return NextResponse.json(mappedQuotes);
  } catch (error) {
    console.error('Quotes GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.quoteNumber) {
      return NextResponse.json({ error: 'Quote number is required' }, { status: 400 });
    }

    if (!data.customerName || !data.customerName.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    // Check if quote number already exists
    const { data: existingQuote } = await supabase
      .from('Quote')
      .select('id')
      .eq('quoteNumber', data.quoteNumber)
      .maybeSingle();

    if (existingQuote) {
      return NextResponse.json({ error: `Quote number ${data.quoteNumber} already exists. Please use a different one.` }, { status: 400 });
    }

    // Find or create customer
    let customerId;
    const { data: existingCustomer } = await supabase
      .from('Customer')
      .select('id')
      .eq('name', data.customerName.trim())
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Optionally update the address/phone/email here
      await supabase
        .from('Customer')
        .update({
          email: data.customerEmail || null,
          phone: data.customerPhone || null,
          address: data.customerAddress || null
        })
        .eq('id', customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('Customer')
        .insert({
          name: data.customerName.trim(),
          email: data.customerEmail || null,
          phone: data.customerPhone || null,
          address: data.customerAddress || null
        })
        .select()
        .single();
      
      if (customerError) throw customerError;
      customerId = newCustomer.id;
    }

    // Create quote
    const { data: quote, error: quoteError } = await supabase
      .from('Quote')
      .insert({
        quoteNumber: data.quoteNumber,
        customerId: customerId,
        discount: data.discount || 0,
        total: data.total || 0,
        contactPerson: data.contactPerson || null,
        refNumber: data.refNumber || null,
        refDate: data.refDate || null,
        cgst: data.cgst ?? 9,
        sgst: data.sgst ?? 9,
        igst: data.igst ?? 0,
        createdAt: data.quoteDate ? new Date(data.quoteDate).toISOString() : undefined,
      })
      .select()
      .single();
      
    if (quoteError) throw quoteError;

    // Create quote items
    const quoteItems = data.items.map((item: any) => ({
      quoteId: quote.id,
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      discount: item.discount || 0,
      articleNumber: item.articleNumber || null,
    }));

    const { error: itemsError } = await supabase
      .from('QuoteItem')
      .insert(quoteItems);

    if (itemsError) throw itemsError;

    // Extract prefix and sequence from quoteNumber and update QuoteSequence
    const parts = data.quoteNumber.split('/');
    if (parts.length >= 3) {
      const prefix = `${parts[0]}/${parts[1]}/`;
      const seqStr = parts[2];
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq)) {
        // We do an UPSERT (insert or update) via Supabase
        await supabase
          .from('QuoteSequence')
          .upsert({ prefix, last_value: seq }, { onConflict: 'prefix' });
      }
    }
    
    // Fetch complete quote with items
    const { data: completeQuote, error: completeQuoteError } = await supabase
      .from('Quote')
      .select('*, Customer(*), items:QuoteItem(*)')
      .eq('id', quote.id)
      .single();
      
    if (completeQuoteError) throw completeQuoteError;

    // Map customer fields for response
    const mappedCompleteQuote = {
      ...completeQuote,
      customerName: completeQuote.Customer?.name,
      customerEmail: completeQuote.Customer?.email,
      customerPhone: completeQuote.Customer?.phone,
      customerAddress: completeQuote.Customer?.address,
    };

    return NextResponse.json(mappedCompleteQuote);
  } catch (error) {
    console.error('Quote POST error:', error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}
