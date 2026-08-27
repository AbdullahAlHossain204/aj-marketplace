import Link from "next/link";
import { apiFetch } from "../lib/apiClient";
import { Category, ProductListItem } from "../lib/types";
import { ProductCard } from "../components/ProductCard";

// Catalog data (stock, prices, new arrivals) changes frequently — render
// this route per-request rather than baking a stale snapshot into the
// static build.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categoriesRes, productsRes] = await Promise.all([
    apiFetch<Category[]>("/api/v1/categories"),
    apiFetch<ProductListItem[]>("/api/v1/products?sort=newest&limit=8"),
  ]);

  const categories = categoriesRes.data ?? [];
  const products = productsRes.data ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-10 rounded-xl bg-brand-600 px-8 py-16 text-center text-white">
        <h1 className="text-4xl font-bold">Welcome to AJ Market</h1>
        <p className="mt-3 text-brand-50">Everything you need, from vendors you trust.</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-md bg-white px-6 py-3 font-medium text-brand-700 hover:bg-brand-50"
        >
          Start Shopping
        </Link>
      </section>

      {categories.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Shop by Category</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center hover:shadow-md"
              >
                <span className="font-medium">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">New Arrivals</h2>
          <Link href="/products" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="text-gray-500">
            No products yet.{" "}
            {!productsRes.success && "(API not reachable — make sure the backend is running on port 4000.)"}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
