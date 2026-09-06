import Link from "next/link";
import { apiFetch } from "../lib/apiClient";
import { Category, HomepageData, formatPrice } from "../lib/types";
import { ProductCard } from "../components/ProductCard";

// Catalog and promotional data (stock, prices, active flash sales) changes
// frequently — render this route per-request rather than baking a stale
// snapshot into the static build.
export const dynamic = "force-dynamic";

function FlashSaleCountdown({ endsAt }: { endsAt: string }) {
  const hoursLeft = Math.max(0, Math.round((new Date(endsAt).getTime() - Date.now()) / 3600000));
  return (
    <span className="text-sm font-medium text-white/90">
      {hoursLeft > 0 ? `Ends in ~${hoursLeft}h` : "Ending soon"}
    </span>
  );
}

export default async function HomePage() {
  const [categoriesRes, homepageRes] = await Promise.all([
    apiFetch<Category[]>("/api/v1/categories"),
    apiFetch<HomepageData>("/api/v1/homepage"),
  ]);

  const categories = categoriesRes.data ?? [];
  const home = homepageRes.data;
  const heroBanner = home?.banners.find((b) => b.placement === "HOMEPAGE_HERO");
  const secondaryBanners = home?.banners.filter((b) => b.placement === "HOMEPAGE_SECONDARY") ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {heroBanner ? (
        <Link href={heroBanner.linkUrl ?? "/products"} className="mb-10 block overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroBanner.imageUrl} alt={heroBanner.title} className="w-full object-cover" />
        </Link>
      ) : (
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
      )}

      {secondaryBanners.length > 0 && (
        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {secondaryBanners.map((b) => (
            <Link key={b.id} href={b.linkUrl ?? "/products"} className="overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt={b.title} className="w-full object-cover" />
            </Link>
          ))}
        </section>
      )}

      {home?.flashSale && (
        <section className="mb-10 rounded-xl bg-red-600 p-6 text-white">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">⚡ {home.flashSale.name}</h2>
            <FlashSaleCountdown endsAt={home.flashSale.endsAt} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {home.flashSale.products.slice(0, 4).map(({ product }) => {
              const discounted =
                home.flashSale!.discountType === "PERCENTAGE"
                  ? Math.round(product.basePrice * (1 - home.flashSale!.discountValue / 100))
                  : Math.max(0, product.basePrice - home.flashSale!.discountValue);
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="rounded-lg bg-white p-3 text-gray-900 hover:shadow-md"
                >
                  <div className="aspect-square overflow-hidden rounded bg-gray-100">
                    {product.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0].url} alt={product.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-medium">{product.name}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-red-600">{formatPrice(discounted, product.currency)}</span>
                    <span className="text-xs text-gray-400 line-through">
                      {formatPrice(product.basePrice, product.currency)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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

      {home && home.featured.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Featured</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {home.featured.map((f) => (
              <ProductCard
                key={f.id}
                product={{
                  id: f.product.id,
                  name: f.product.name,
                  slug: f.product.slug,
                  brand: null,
                  price: f.product.basePrice,
                  compareAtPrice: null,
                  flashSale: null,
                  currency: f.product.currency,
                  image: f.product.images[0] ? { url: f.product.images[0].url } : null,
                  store: { name: "", slug: "" },
                  category: { name: "", slug: "" },
                  rating: null,
                  reviewCount: 0,
                  inStock: true,
                }}
              />
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

        {!home || home.newArrivals.length === 0 ? (
          <p className="text-gray-500">
            No products yet.{" "}
            {!homepageRes.success && "(API not reachable — make sure the backend is running on port 4000.)"}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {home.newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
