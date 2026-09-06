import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/apiClient";
import { ProductDetail, ProductListItem, formatPrice } from "../../../lib/types";
import { ProductActions } from "../../../components/ProductActions";
import { ReviewForm } from "../../../components/ReviewForm";
import { ReportReviewButton } from "../../../components/ReportReviewButton";
import { ProductCard } from "../../../components/ProductCard";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [res, recommendedRes] = await Promise.all([
    apiFetch<ProductDetail>(`/api/v1/products/${params.slug}`),
    apiFetch<ProductListItem[]>(`/api/v1/products/${params.slug}/recommendations`),
  ]);

  if (!res.success || !res.data) {
    notFound();
  }

  const product = res.data;
  const recommended = recommendedRes.data ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0].url}
              alt={product.images[0].altText ?? product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">No image</div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-gray-500">
              {product.store.name} · {product.category.name}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
            {product.rating !== null && (
              <p className="mt-1 text-sm text-gray-500">
                ★ {product.rating.toFixed(1)} ({product.reviewCount} reviews)
              </p>
            )}
          </div>

          <p className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-brand-600">
              {formatPrice(product.basePrice, product.currency)}
            </span>
            {product.compareAtPrice && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(product.compareAtPrice, product.currency)}
              </span>
            )}
            {product.flashSale && (
              <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">FLASH SALE</span>
            )}
          </p>

          {product.description && <p className="text-gray-700">{product.description}</p>}

          <ProductActions productId={product.id} variants={product.variants} />
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold">Customer Reviews</h2>

        <div className="mb-6 max-w-md">
          <ReviewForm productId={product.id} />
        </div>

        {product.reviews.length > 0 && (
          <div className="flex flex-col gap-4">
            {product.reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{review.user.name}</span>
                  <span className="text-sm text-gray-500">★ {review.rating}</span>
                </div>
                {review.isVerifiedPurchase && (
                  <span className="text-xs font-medium text-green-600">Verified Purchase</span>
                )}
                {review.title && <p className="mt-2 font-medium">{review.title}</p>}
                {review.comment && <p className="mt-1 text-sm text-gray-700">{review.comment}</p>}
                <div className="mt-2">
                  <ReportReviewButton reviewId={review.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {recommended.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">You May Also Like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
