import { NextRequest, NextResponse } from 'next/server';
import { productListQuerySchema } from '@/lib/validation/product.schema';
import { listProducts } from '@/services/product.service';

export async function GET(req: NextRequest) {
  const parsed = productListQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: 'Invalid query parameters', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const result = await listProducts(parsed.data);
    return NextResponse.json({
      data: result.products,
      error: null,
      meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Failed to load products' } }, { status: 500 });
  }
}
