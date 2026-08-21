import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/utils/password';
import { registerSchema } from '@/lib/validation/auth.schema';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: 'Invalid request', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }
  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(
        (c): c is NonNullable<typeof c> => Boolean(c)
      ),
    },
  });
  if (existing) {
    return NextResponse.json(
      { data: null, error: { message: 'An account with that email or phone already exists.' } },
      { status: 409 }
    );
  }

  const customerRole = await prisma.role.findUnique({ where: { name: 'customer' } });
  if (!customerRole) {
    // Means prisma/seed.ts hasn't been run — a deploy/config problem, not a
    // user error, so this is a 500 not a 400.
    return NextResponse.json(
      { data: null, error: { message: 'Registration is temporarily unavailable.' } },
      { status: 500 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      roleId: customerRole.id,
      status: 'ACTIVE', // email/phone verification flow is a documented future step, not gating login for MVP
    },
  });

  return NextResponse.json(
    { data: { id: user.id, name: user.name, email: user.email }, error: null },
    { status: 201 }
  );
}
