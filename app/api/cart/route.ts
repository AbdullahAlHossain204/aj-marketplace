import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { addCartItemSchema } from '@/lib/validation/cart.schema';
import { addItemToCart, computeCartSummary, getCart, CartError } from '@/services/cart.service';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Sign in required' } }, { status: 401 });
  }

  const cart = await getCart(user.id);
  return NextResponse.json({ data: cart, error: null, meta: computeCartSummary(cart) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Sign in required' } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = addCartItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: 'Invalid request', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const cart = await addItemToCart(user.id, parsed.data.variantId, parsed.data.quantity);
    return NextResponse.json({ data: cart, error: null, meta: computeCartSummary(cart) });
  } catch (err) {
    if (err instanceof CartError) {
      const status = err.code === 'OUT_OF_STOCK' ? 409 : err.code === 'PRODUCT_UNAVAILABLE' ? 410 : 404;
      return NextResponse.json({ data: null, error: { message: err.message } }, { status });
    }
    return NextResponse.json({ data: null, error: { message: 'Failed to update cart' } }, { status: 500 });
  }
}
