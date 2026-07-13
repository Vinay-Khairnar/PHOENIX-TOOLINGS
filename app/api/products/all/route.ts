import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE() {
  try {
    // Delete all products
    await prisma.product.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete all products:', error);
    return NextResponse.json({ error: 'Failed to delete products' }, { status: 500 });
  }
}
