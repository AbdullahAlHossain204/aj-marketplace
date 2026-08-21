import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductGrid } from '@/components/product/product-grid';
import { FilterSidebar } from '@/components/catalog/filter-sidebar';
import { SortSelect } from '@/components/catalog/sort-select';
import { Pagination } from '@/components/catalog/pagination';
import { getCategoryBySlug } from '@/services/category.service';
import { listProducts } from '@/services/product.service';
import { productListQuerySchema } from '@/lib/validation/product.schema';

export const revalidate = 60;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const parsed = productListQuerySchema.safeParse(searchParams);
  const query = parsed.success ? parsed.data : productListQuerySchema.parse({});
  const result = await listProducts(query, { categorySlug: params.slug });

  function buildHref(page: number) {
    const params = new URLSearchParams();
    if (query.sort !== 'newest') params.set('sort', query.sort);
    if (query.minPrice !== undefined) params.set('minPrice', String(query.minPrice));
    if (query.maxPrice !== undefined) params.set('maxPrice', String(query.maxPrice));
    params.set('page', String(page));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <nav className="mb-2 text-sm text-ink-400">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          {category.parent && (
            <>
              {' / '}
              <Link href={`/categories/${category.parent.slug}`} className="hover:text-brand-600">
                {category.parent.name}
              </Link>
            </>
          )}
          {' / '}
          <span className="text-ink-600">{category.name}</span>
        </nav>
        <h1 className="text-2xl font-semibold text-ink-900">{category.name}</h1>
        {category.children.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/categories/${child.slug}`}
                className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:border-brand-600 hover:text-brand-600"
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <FilterSidebar />
        </aside>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-500">{result.total} products</p>
            <SortSelect />
          </div>
          <ProductGrid products={result.products} />
          <Pagination page={result.page} totalPages={result.totalPages} buildHref={buildHref} />
        </div>
      </div>
    </div>
  );
}
