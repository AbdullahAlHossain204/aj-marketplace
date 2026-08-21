import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getOrderForUser } from '@/services/order.service';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Sign in required' } }, { status: 401 });
  }

  // getOrderForUser already scopes by userId — a customer can never fetch
  // another customer's order by guessing an id.
  const order = await getOrderForUser(user.id, params.id);
  if (!order) {
    return NextResponse.json({ data: null, error: { message: 'Order not found' } }, { status: 404 });
  }
  return NextResponse.json({ data: order, error: null });
}
