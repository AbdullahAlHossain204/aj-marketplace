import Link from "next/link";
import { ProductListItem, formatPrice } from "../lib/types";

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {product.flashSale && (
          <span className="absolute m-2 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            ⚡ {product.flashSale.discountType === "PERCENTAGE" ? `${product.flashSale.discountValue}%` : formatPrice(product.flashSale.discountValue, product.currency)} OFF
          </span>
        )}
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image.url}
            alt={product.image.altText ?? product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">No image</div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-xs text-gray-500">
          {product.brand ? `${product.brand} · ` : ""}
          {product.store.name}
        </span>
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</h3>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="flex items-baseline gap-1.5">
            <span className="text-base font-semibold text-brand-600">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.compareAtPrice && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.compareAtPrice, product.currency)}
              </span>
            )}
          </span>
          {product.rating !== null && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              ★ {product.rating.toFixed(1)} ({product.reviewCount})
            </span>
          )}
        </div>

        {!product.inStock && <span className="text-xs font-medium text-red-600">Out of stock</span>}
      </div>
    </Link>
  );
}
