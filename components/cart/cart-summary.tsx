import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';

export function CartSummary({
  subtotal,
  itemCount,
  showCheckoutButton = true,
}: {
  subtotal: number;
  itemCount: number;
  showCheckoutButton?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink-100 p-5">
      <h2 className="font-semibold text-ink-800">Order summary</h2>
      <div className="flex justify-between text-sm text-ink-600">
        <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <p className="text-xs text-ink-400">Delivery fee calculated at checkout.</p>
      {showCheckoutButton && (
        <Link href="/checkout" className="mt-2">
          <Button variant="primary" className="w-full" disabled={itemCount === 0}>
            Proceed to checkout
          </Button>
        </Link>
      )}
    </div>
  );
}
