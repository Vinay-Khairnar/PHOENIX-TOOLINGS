import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('Product').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const updatePayload: Record<string, any> = {};
    if (data.name !== undefined)          updatePayload.name          = data.name;
    if (data.itemNumber !== undefined)    updatePayload.itemNumber    = data.itemNumber || null;
    if (data.drawingNumber !== undefined) updatePayload.drawingNumber = data.drawingNumber || null;
    if (data.make !== undefined)          updatePayload.make          = data.make ? data.make.toUpperCase() : null;
    if (data.price !== undefined)         updatePayload.price         = parseFloat(data.price);

    const { data: updated, error } = await supabase
      .from('Product')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

