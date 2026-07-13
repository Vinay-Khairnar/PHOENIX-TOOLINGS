import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const skip = (page - 1) * limit;

  try {
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search } },
            { sku: { contains: search } },
            { articleNumber: { contains: search } },
          ],
        }
      : undefined;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        take: limit,
        skip,
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where: whereClause })
    ]);
    
    return NextResponse.json({
      products,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      totalCount
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku || null,
        articleNumber: data.articleNumber || null,
        price: parseFloat(data.price),
        description: data.description || null,
      },
    });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
