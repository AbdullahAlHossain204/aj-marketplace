import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CategoryCard } from '@/components/category/category-card';
import { ProductGrid } from '@/components/product/product-grid';
import { getCategoryTree } from '@/services/category.service';
import { listProducts } from '@/services/product.service';
import { productListQuerySchema } from '@/lib/validation/product.schema';

export const revalidate = 60;

export default async function HomePage() {
  const [categories, trending] = await Promise.all([
    getCategoryTree(),
    listProducts(productListQuerySchema.parse({ sort: 'newest', limit: 12 })),
  ]);

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col items-center gap-4 rounded-xl bg-brand-50 px-6 py-16 text-center">
        <span className="text-sm font-medium uppercase tracking-wide text-brand-600">AJ Marketplace</span>
        <h1 className="max-w-2xl text-3xl font-semibold text-ink-900 sm:text-4xl">
          Shop thousands of products from trusted local sellers.
        </h1>
        <p className="max-w-xl text-ink-500">
          Browse categories, compare stores, and check out with Cash on Delivery.
        </p>
        <Link href="/search">
          <Button size="lg">Start shopping</Button>
        </Link>
      </section>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-ink-900">Shop by category</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink-900">Trending now</h2>
          <Link href="/search" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        <ProductGrid products={trending.products} />
      </section>
    </div>
  );
}
