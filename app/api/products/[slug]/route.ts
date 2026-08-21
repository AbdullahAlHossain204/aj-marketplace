import { NextResponse } from 'next/server';
import { getProductBySlug } from '@/services/product.service';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const product = await getProductBySlug(params.slug);
    if (!product) {
      return NextResponse.json({ data: null, error: { message: 'Product not found' } }, { status: 404 });
    }
    return NextResponse.json({ data: product, error: null });
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Failed to load product' } }, { status: 500 });
  }
}
