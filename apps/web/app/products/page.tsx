import { apiFetch } from "../../lib/apiClient";
import { Category, Pagination as PaginationMeta, ProductListItem } from "../../lib/types";
import { ProductCard } from "../../components/ProductCard";
import { ProductFilters } from "../../components/ProductFilters";
import { Pagination } from "../../components/Pagination";

export const dynamic = "force-dynamic";

interface ProductsPageProps {
  searchParams: Record<string, string | undefined>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) query.set(key, value);
  }

  const [productsRes, categoriesRes] = await Promise.all([
    apiFetch<ProductListItem[]>(`/api/v1/products?${query.toString()}`),
    apiFetch<Category[]>("/api/v1/categories"),
  ]);

  const products = productsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const pagination: PaginationMeta = productsRes.meta?.pagination ?? {
    page: 1,
    limit: 20,
    total: products.length,
    totalPages: 1,
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Shop All Products</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
        <aside>
          <ProductFilters categories={categories} />
        </aside>

        <section>
          {!productsRes.success && (
            <p className="text-red-600">Could not load products. Please try again.</p>
          )}

          {productsRes.success && products.length === 0 && (
            <p className="text-gray-500">No products found. Try adjusting your filters.</p>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <Pagination pagination={pagination} searchParams={searchParams} />
        </section>
      </div>
    </main>
  );
}
