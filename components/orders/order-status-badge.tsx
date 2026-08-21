import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT = {
  PENDING: 'neutral',
  CONFIRMED: 'brand',
  PROCESSING: 'brand',
  SHIPPED: 'brand',
  OUT_FOR_DELIVERY: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURNED: 'warning',
  REFUNDED: 'warning',
  FAILED: 'danger',
} as const;

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
  FAILED: 'Failed',
};

export function OrderStatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status as keyof typeof STATUS_VARIANT] ?? 'neutral';
  return <Badge variant={variant}>{STATUS_LABEL[status] ?? status}</Badge>;
}
