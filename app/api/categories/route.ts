import { NextResponse } from 'next/server';
import { getCategoryTree } from '@/services/category.service';

export async function GET() {
  try {
    const categories = await getCategoryTree();
    return NextResponse.json({ data: categories, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: { message: 'Failed to load categories' } },
      { status: 500 }
    );
  }
}
