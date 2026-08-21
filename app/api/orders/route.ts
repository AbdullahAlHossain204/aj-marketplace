import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { checkoutSchema } from '@/lib/validation/checkout.schema';
import { createOrderFromCart, listOrdersForUser, CheckoutError } from '@/services/order.service';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Sign in required' } }, { status: 401 });
  }
  const orders = await listOrdersForUser(user.id);
  return NextResponse.json({ data: orders, error: null });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Sign in required' } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: 'Invalid request', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const order = await createOrderFromCart(user.id, parsed.data);
    return NextResponse.json({ data: order, error: null }, { status: 201 });
  } catch (err) {
    if (err instanceof CheckoutError) {
      const status =
        err.code === 'ADDRESS_NOT_FOUND' ? 404 : err.code === 'EMPTY_CART' ? 422 : 409;
      return NextResponse.json({ data: null, error: { message: err.message } }, { status });
    }
    return NextResponse.json({ data: null, error: { message: 'Failed to place order' } }, { status: 500 });
  }
}
