import { formatPrice } from '@/lib/utils/format';

export function Price({
  basePrice,
  discountPrice,
  size = 'md',
}: {
  basePrice: number | string;
  discountPrice?: number | string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const hasDiscount = discountPrice != null && Number(discountPrice) < Number(basePrice);
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';

  if (!hasDiscount) {
    return <span className={`font-semibold text-ink-900 ${textSize}`}>{formatPrice(basePrice)}</span>;
  }

  return (
    <span className="flex items-baseline gap-2">
      <span className={`font-semibold text-ink-900 ${textSize}`}>{formatPrice(discountPrice!)}</span>
      <span className="text-sm text-ink-400 line-through">{formatPrice(basePrice)}</span>
    </span>
  );
}
