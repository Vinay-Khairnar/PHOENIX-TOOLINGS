import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const quotes = await prisma.quote.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(quotes);
  } catch (error) {
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
    const existingQuote = await prisma.quote.findUnique({
      where: { quoteNumber: data.quoteNumber }
    });

    if (existingQuote) {
      return NextResponse.json({ error: `Quote number ${data.quoteNumber} already exists. Please use a different one.` }, { status: 400 });
    }

    // Find or create customer by name
    let customer = await prisma.customer.findFirst({
      where: { name: { equals: data.customerName.trim(), mode: 'insensitive' } }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: data.customerName.trim(),
          email: data.customerEmail || null,
          phone: data.customerPhone || null,
          address: data.customerAddress || null,
        },
      });
    } else {
      // Update customer info if provided
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          email: data.customerEmail || customer.email,
          phone: data.customerPhone || customer.phone,
          address: data.customerAddress || customer.address,
        },
      });
    }

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: data.quoteNumber,
        customerId: customer.id,
        discount: data.discount || 0,
        total: data.total || 0,
        contactPerson: data.contactPerson || null,
        refNumber: data.refNumber || null,
        refDate: data.refDate || null,
        cgst: data.cgst ?? 9,
        sgst: data.sgst ?? 9,
        igst: data.igst ?? 0,
        createdAt: data.quoteDate ? new Date(data.quoteDate) : undefined,
        items: {
          create: data.items.map((item: any) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            discount: item.discount || 0,
            articleNumber: item.articleNumber || null,
          })),
        },
      },
      include: { items: true, customer: true },
    });
    
    return NextResponse.json(quote);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}
