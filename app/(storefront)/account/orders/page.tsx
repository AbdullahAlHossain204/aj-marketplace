import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { getCurrentUser } from '@/lib/auth/session';
import { listOrdersForUser } from '@/services/order.service';
import { formatDate, formatPrice } from '@/lib/utils/format';

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/account/orders');

  const orders = await listOrdersForUser(user.id);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <h1 className="text-2xl font-semibold text-ink-900">No orders yet</h1>
        <p className="text-ink-500">Your order history will show up here once you check out.</p>
        <Link href="/search" className="font-medium text-brand-600 hover:underline">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink-900">Your orders</h1>
      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="flex flex-col gap-2 rounded-lg border border-ink-100 p-4 hover:border-brand-300 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-ink-800">{order.orderNumber}</p>
              <p className="text-sm text-ink-400">Placed {formatDate(order.createdAt)}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-ink-800">{formatPrice(order.total)}</span>
              <OrderStatusBadge status={order.orderStatus} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
