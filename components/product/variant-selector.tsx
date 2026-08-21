'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Price } from '@/components/product/price';
import { cn } from '@/lib/utils/cn';

export interface VariantData {
  id: string;
  price: number | string;
  attributes: Record<string, string>;
  inventory: { quantity: number; reserved: number } | null;
}

export function VariantSelector({
  variants,
  productSlug,
}: {
  variants: VariantData[];
  productSlug: string;
}) {
  const router = useRouter();

  // Build one selector per attribute key present across variants (e.g. "size", "color").
  const attributeKeys = useMemo(() => {
    const keys = new Set<string>();
    variants.forEach((v) => Object.keys(v.attributes).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const first = variants[0];
    return first ? { ...first.attributes } : {};
  });
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const activeVariant = useMemo(
    () =>
      variants.find((v) => attributeKeys.every((key) => v.attributes[key] === selected[key])) ??
      variants[0],
    [variants, attributeKeys, selected]
  );

  const available = activeVariant
    ? (activeVariant.inventory?.quantity ?? 0) - (activeVariant.inventory?.reserved ?? 0)
    : 0;

  async function addToCart() {
    if (!activeVariant) return;
    setStatus('loading');
    setMessage(null);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: activeVariant.id, quantity }),
      });
      if (res.status === 401) {
        router.push(`/login?callbackUrl=/products/${productSlug}`);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(json.error?.message ?? 'Could not add to cart.');
        return;
      }
      setStatus('success');
      setMessage('Added to cart.');
      router.refresh();
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (variants.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {activeVariant && <Price basePrice={activeVariant.price} size="lg" />}

      {attributeKeys.map((key) => {
        // .filter(Boolean) doesn't narrow (string | undefined)[] to string[] in
        // TS — use a type predicate so `options` (and the click handler below)
        // are actually typed as string, not string | undefined.
        const options = Array.from(
          new Set(variants.map((v) => v.attributes[key]).filter((v): v is string => Boolean(v)))
        );
        if (options.length <= 1) return null;
        return (
          <div key={key}>
            <span className="mb-2 block text-sm font-medium capitalize text-ink-700">{key}</span>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelected((s) => ({ ...s, [key]: option }))}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm',
                    selected[key] === option
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-ink-300 text-ink-700 hover:border-ink-400'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div>
        {available > 0 ? (
          <span className="text-sm text-success">
            {available <= 5 ? `Only ${available} left in stock` : 'In stock'}
          </span>
        ) : (
          <span className="text-sm text-danger">Out of stock</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border border-ink-300">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="h-10 w-10 text-ink-600 hover:bg-ink-50"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center text-sm">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(20, available, q + 1))}
            className="h-10 w-10 text-ink-600 hover:bg-ink-50"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <Button onClick={addToCart} disabled={available === 0 || status === 'loading'} className="flex-1">
          {status === 'loading' ? 'Adding…' : available === 0 ? 'Out of stock' : 'Add to cart'}
        </Button>
      </div>

      {message && (
        <p className={cn('text-sm', status === 'error' ? 'text-danger' : 'text-success')}>{message}</p>
      )}
    </div>
  );
}
