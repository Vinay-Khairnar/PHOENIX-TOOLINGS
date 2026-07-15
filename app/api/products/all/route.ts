import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE() {
  try {
    // Delete all products
    const { error } = await supabase.from('Product').delete().not('id', 'is', null);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete all products:', error);
    return NextResponse.json({ error: 'Failed to delete products' }, { status: 500 });
  }
}
