import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ data: { status: 'ok' }, error: null });
  } catch (err) {
    // Never leak internal error details to the client.
    return NextResponse.json(
      { data: null, error: { message: 'Service unavailable' } },
      { status: 503 }
    );
  }
}
