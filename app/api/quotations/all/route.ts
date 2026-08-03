import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    const { error } = await supabase.from('Quote').delete().not('id', 'is', null);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete all quotes:', error);
    return NextResponse.json({ error: 'Failed to delete all quotes' }, { status: 500 });
  }
}
