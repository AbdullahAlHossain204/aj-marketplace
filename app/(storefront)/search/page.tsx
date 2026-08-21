import { ProductGrid } from '@/components/product/product-grid';
import { FilterSidebar } from '@/components/catalog/filter-sidebar';
import { SortSelect } from '@/components/catalog/sort-select';
import { Pagination } from '@/components/catalog/pagination';
import { listProducts } from '@/services/product.service';
import { productListQuerySchema } from '@/lib/validation/product.schema';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const parsed = productListQuerySchema.safeParse(searchParams);
  const query = parsed.success ? parsed.data : productListQuerySchema.parse({});
  const result = await listProducts(query);

  function buildHref(page: number) {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.category) params.set('category', query.category);
    if (query.brand) params.set('brand', query.brand);
    if (query.sort !== 'newest') params.set('sort', query.sort);
    if (query.minPrice !== undefined) params.set('minPrice', String(query.minPrice));
    if (query.maxPrice !== undefined) params.set('maxPrice', String(query.maxPrice));
    params.set('page', String(page));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink-900">
        {query.q ? `Results for "${query.q}"` : 'All products'}
      </h1>

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
