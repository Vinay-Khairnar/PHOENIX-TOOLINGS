import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const skip = (page - 1) * limit;

  try {
    let query = supabase.from('Product').select('*', { count: 'exact' });
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,articleNumber.ilike.%${search}%`);
    }

    const { data: products, count: totalCount, error } = await query
      .order('name', { ascending: true })
      .range(skip, skip + limit - 1);

    if (error) throw error;
    
    return NextResponse.json({
      products,
      totalPages: Math.ceil((totalCount || 0) / limit),
      currentPage: page,
      totalCount: totalCount || 0
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { data: product, error } = await supabase.from('Product').insert({
      name: data.name,
      sku: data.sku || null,
      articleNumber: data.articleNumber || null,
      price: parseFloat(data.price),
      description: data.description || null,
    }).select().single();
    
    if (error) throw error;
    return NextResponse.json(product);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
