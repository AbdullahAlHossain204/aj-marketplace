import Link from 'next/link';
import { Star } from 'lucide-react';
import { Price } from '@/components/product/price';

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  basePrice: number | string;
  discountPrice: number | string | null;
  ratingAvg: number | string;
  reviewCount: number;
  images: { url: string; altText: string | null }[];
  store: { name: string; slug: string };
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-ink-100 bg-white transition-shadow hover:shadow-md"
    >
      <div className="aspect-square w-full overflow-hidden bg-ink-50">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- product images come from
          // arbitrary seller-supplied hosts; next/image would require allow-listing every one.
          <img
            src={image.url}
            alt={image.altText ?? product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-400">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="truncate text-xs text-ink-400">{product.store.name}</span>
        <h3 className="line-clamp-2 text-sm font-medium text-ink-800">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-1">
          <Price basePrice={product.basePrice} discountPrice={product.discountPrice} size="sm" />
          {Number(product.reviewCount) > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-ink-500">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {Number(product.ratingAvg).toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
