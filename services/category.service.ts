import { prisma } from '@/lib/db/prisma';

/**
 * Two-level tree (root categories + their direct children) — enough for a
 * mega-menu / homepage grid without recursive queries. If deeper nesting is
 * needed later, extend the `include` one level at a time rather than
 * switching to a recursive CTE prematurely.
 */
export async function getCategoryTree() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: 'asc' },
    include: {
      children: {
        orderBy: { name: 'asc' },
      },
    },
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      children: { orderBy: { name: 'asc' } },
      parent: true,
    },
  });
}

/**
 * A category page shows products from the category itself AND its direct
 * children (e.g. "Electronics" also lists "Phones", "Laptops" products) —
 * returns the id list to feed into product.service's `categoryIds` filter.
 */
export async function getCategoryAndDescendantIds(slug: string): Promise<string[] | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { children: { select: { id: true } } },
  });
  if (!category) return null;
  return [category.id, ...category.children.map((c) => c.id)];
}
