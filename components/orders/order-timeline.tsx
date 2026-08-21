import { cn } from '@/lib/utils/cn';

const HAPPY_PATH = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

const STEP_LABEL: Record<string, string> = {
  PENDING: 'Order placed',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
};

/**
 * There's no per-step timestamp history table yet (Shipment.events JSON is
 * reserved for that, populated once the courier-integration phase writes to
 * it) — so this renders "how far along the happy path is this order",
 * which is honest about what we can show today without inventing
 * timestamps we don't have.
 */
export function OrderTimeline({ status }: { status: string }) {
  if (status === 'CANCELLED' || status === 'FAILED') {
    return <p className="text-sm text-danger">This order was {status.toLowerCase()}.</p>;
  }
  if (status === 'RETURNED' || status === 'REFUNDED') {
    return <p className="text-sm text-warning">This order was {status.toLowerCase()}.</p>;
  }

  const currentIndex = HAPPY_PATH.indexOf(status as (typeof HAPPY_PATH)[number]);

  return (
    <ol className="flex flex-wrap gap-4">
      {HAPPY_PATH.map((step, i) => {
        const reached = currentIndex >= 0 && i <= currentIndex;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                reached ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400'
              )}
            >
              {i + 1}
            </span>
            <span className={cn('text-sm', reached ? 'font-medium text-ink-800' : 'text-ink-400')}>
              {STEP_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
