import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const make = searchParams.get('make');

    if (!make || !make.trim()) {
      return NextResponse.json({ error: 'Make is required' }, { status: 400 });
    }

    const normalizedMake = make.trim();

    const { count, error } = await supabase
      .from('Product')
      .select('*', { count: 'exact', head: true })
      .ilike('make', normalizedMake);

    if (error) throw error;

    return NextResponse.json({
      make: normalizedMake,
      count: count || 0,
    });
  } catch (error) {
    console.error('Failed to get product count by make:', error);
    return NextResponse.json({ error: 'Failed to get product count' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let make = searchParams.get('make');

    if (!make) {
      try {
        const body = await request.json();
        make = body?.make;
      } catch {
        // Body was empty or not JSON
      }
    }

    if (!make || !make.trim()) {
      return NextResponse.json({ error: 'Make is required' }, { status: 400 });
    }

    const normalizedMake = make.trim();

    // First check count of products to be deleted
    const { count, error: countError } = await supabase
      .from('Product')
      .select('*', { count: 'exact', head: true })
      .ilike('make', normalizedMake);

    if (countError) throw countError;

    // Delete matching products from Product table
    const { error: deleteError } = await supabase
      .from('Product')
      .delete()
      .ilike('make', normalizedMake);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      count: count || 0,
      make: normalizedMake,
    });
  } catch (error) {
    console.error('Failed to delete products by make:', error);
    return NextResponse.json({ error: 'Failed to delete products' }, { status: 500 });
  }
}
