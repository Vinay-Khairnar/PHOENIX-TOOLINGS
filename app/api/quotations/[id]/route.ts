import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: quote, error } = await supabase
      .from('Quote')
      .select('*, Customer(*), items:QuoteItem(*)')
      .eq('id', id)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const mappedQuote = {
      ...quote,
      customerName: quote.Customer?.name,
      customerEmail: quote.Customer?.email,
      customerPhone: quote.Customer?.phone,
      customerAddress: quote.Customer?.address,
    };

    return NextResponse.json(mappedQuote);
  } catch (error) {
    console.error('Failed to fetch quote:', error);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    if (!data.quoteNumber) {
      return NextResponse.json({ error: 'Quote number is required' }, { status: 400 });
    }

    if (!data.customerName || !data.customerName.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Check if another quote has the same quoteNumber
    const { data: existingQuote } = await supabase
      .from('Quote')
      .select('id')
      .eq('quoteNumber', data.quoteNumber)
      .neq('id', id)
      .maybeSingle();

    if (existingQuote) {
      return NextResponse.json(
        { error: `Quote number ${data.quoteNumber} already belongs to another quote.` },
        { status: 400 }
      );
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
      await supabase
        .from('Customer')
        .update({
          email: data.customerEmail || null,
          phone: data.customerPhone || null,
          address: data.customerAddress || null,
        })
        .eq('id', customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('Customer')
        .insert({
          name: data.customerName.trim(),
          email: data.customerEmail || null,
          phone: data.customerPhone || null,
          address: data.customerAddress || null,
        })
        .select()
        .single();

      if (customerError) throw customerError;
      customerId = newCustomer.id;
    }

    let createdAt: string | undefined = undefined;
    if (data.quoteDate) {
      const now = new Date();
      const selected = new Date(data.quoteDate);
      selected.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      createdAt = selected.toISOString();
    }

    // Update Quote
    const updatePayload: Record<string, any> = {
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
    };

    if (createdAt) {
      updatePayload.createdAt = createdAt;
    }

    let termsColumnMissing = false;
    if (typeof data.termsAndConditions === 'string') {
      updatePayload.termsAndConditions = data.termsAndConditions;
    }

    let { error: quoteUpdateError } = await supabase
      .from('Quote')
      .update(updatePayload)
      .eq('id', id);

    if (
      quoteUpdateError &&
      'termsAndConditions' in updatePayload &&
      (quoteUpdateError.code === '42703' ||
        quoteUpdateError.code === 'PGRST204' ||
        quoteUpdateError.message?.includes('termsAndConditions'))
    ) {
      termsColumnMissing = true;
      delete updatePayload.termsAndConditions;
      const retry = await supabase
        .from('Quote')
        .update(updatePayload)
        .eq('id', id);
      quoteUpdateError = retry.error;
    }

    if (quoteUpdateError) throw quoteUpdateError;

    // Delete existing quote items
    const { error: deleteItemsError } = await supabase
      .from('QuoteItem')
      .delete()
      .eq('quoteId', id);

    if (deleteItemsError) throw deleteItemsError;

    // Insert updated quote items
    const quoteItems = data.items.map((item: any) => ({
      quoteId: id,
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      discount: item.discount || 0,
      itemNumber: item.itemNumber || null,
      make: item.make ? item.make.toUpperCase() : null,
      drgNumber: item.drgNumber || null,
    }));

    const { error: itemsError } = await supabase
      .from('QuoteItem')
      .insert(quoteItems);

    if (itemsError) throw itemsError;

    // Fetch complete quote with items
    const { data: completeQuote, error: completeQuoteError } = await supabase
      .from('Quote')
      .select('*, Customer(*), items:QuoteItem(*)')
      .eq('id', id)
      .single();

    if (completeQuoteError) throw completeQuoteError;

    const mappedCompleteQuote = {
      ...completeQuote,
      customerName: completeQuote.Customer?.name,
      customerEmail: completeQuote.Customer?.email,
      customerPhone: completeQuote.Customer?.phone,
      customerAddress: completeQuote.Customer?.address,
      ...(termsColumnMissing ? { termsColumnMissing: true } : {}),
    };

    return NextResponse.json(mappedCompleteQuote);
  } catch (error) {
    console.error('Quote PUT error:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // QuoteItem relies on ON DELETE CASCADE, so we just delete the Quote
    const { error } = await supabase.from('Quote').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete quote:', error);
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
  }
}
