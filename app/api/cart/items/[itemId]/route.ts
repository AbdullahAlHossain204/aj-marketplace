import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateCartItemSchema } from '@/lib/validation/cart.schema';
import { computeCartSummary, removeCartItem, updateCartItemQuantity, CartError } from '@/services/cart.service';

export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Sign in required' } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateCartItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: 'Invalid request', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const cart = await updateCartItemQuantity(user.id, params.itemId, parsed.data.quantity);
    return NextResponse.json({ data: cart, error: null, meta: computeCartSummary(cart) });
  } catch (err) {
    if (err instanceof CartError) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'OUT_OF_STOCK' ? 409 : 410;
      return NextResponse.json({ data: null, error: { message: err.message } }, { status });
    }
    return NextResponse.json({ data: null, error: { message: 'Failed to update cart' } }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { itemId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Sign in required' } }, { status: 401 });
  }

  try {
    const cart = await removeCartItem(user.id, params.itemId);
    return NextResponse.json({ data: cart, error: null, meta: computeCartSummary(cart) });
  } catch (err) {
    if (err instanceof CartError) {
      return NextResponse.json({ data: null, error: { message: err.message } }, { status: 404 });
    }
    return NextResponse.json({ data: null, error: { message: 'Failed to update cart' } }, { status: 500 });
  }
}
