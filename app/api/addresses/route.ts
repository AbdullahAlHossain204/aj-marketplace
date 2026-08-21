import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { addressSchema } from '@/lib/validation/address.schema';
import { createAddress, listAddresses } from '@/services/address.service';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Sign in required' } }, { status: 401 });
  }
  const addresses = await listAddresses(user.id);
  return NextResponse.json({ data: addresses, error: null });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Sign in required' } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: 'Invalid request', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const address = await createAddress(user.id, parsed.data);
  return NextResponse.json({ data: address, error: null }, { status: 201 });
}
