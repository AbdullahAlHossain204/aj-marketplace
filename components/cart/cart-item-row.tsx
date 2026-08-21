'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Price } from '@/components/product/price';
import { formatPrice } from '@/lib/utils/format';

export interface CartItemData {
  id: string;
  quantity: number;
  variant: {
    id: string;
    price: number | string;
    attributes: Record<string, string>;
    inventory: { quantity: number; reserved: number } | null;
    product: {
      name: string;
      slug: string;
      images: { url: string; altText: string | null }[];
      store: { name: string };
    };
  };
}

export function CartItemRow({ item }: { item: CartItemData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const image = item.variant.product.images[0];
  const available = (item.variant.inventory?.quantity ?? 0) - (item.variant.inventory?.reserved ?? 0);
  const attrSummary = Object.entries(item.variant.attributes)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  function updateQuantity(quantity: number) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/cart/items/${item.id}`, {
        method: quantity === 0 ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: quantity === 0 ? undefined : JSON.stringify({ quantity }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'Could not update cart.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex gap-4 border-b border-ink-100 py-4 last:border-0">
      <Link href={`/products/${item.variant.product.slug}`} className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-ink-50">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.altText ?? item.variant.product.name} className="h-full w-full object-cover" />
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-1">
        <Link href={`/products/${item.variant.product.slug}`} className="text-sm font-medium text-ink-800 hover:text-brand-600">
          {item.variant.product.name}
        </Link>
        <span className="text-xs text-ink-400">{item.variant.product.store.name}</span>
        {attrSummary && <span className="text-xs text-ink-500">{attrSummary}</span>}
        {available < item.quantity && (
          <span className="text-xs text-danger">Only {Math.max(available, 0)} left in stock</span>
        )}
        {error && <span className="text-xs text-danger">{error}</span>}
        <div className="mt-1 flex items-center gap-3">
          <div className="flex items-center rounded-md border border-ink-300">
            <button
              type="button"
              disabled={isPending}
              onClick={() => updateQuantity(Math.max(0, item.quantity - 1))}
              className="h-8 w-8 text-ink-600 hover:bg-ink-50 disabled:opacity-50"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <button
              type="button"
              disabled={isPending || item.quantity >= available}
              onClick={() => updateQuantity(item.quantity + 1)}
              className="h-8 w-8 text-ink-600 hover:bg-ink-50 disabled:opacity-50"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => updateQuantity(0)}
            className="text-xs font-medium text-ink-400 hover:text-danger"
          >
            Remove
          </button>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <Price basePrice={item.variant.price} size="sm" />
        <span className="text-xs text-ink-400">= {formatPrice(Number(item.variant.price) * item.quantity)}</span>
      </div>
    </div>
  );
}
