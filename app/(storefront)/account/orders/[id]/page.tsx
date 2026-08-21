import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { OrderTimeline } from '@/components/orders/order-timeline';
import { getCurrentUser } from '@/lib/auth/session';
import { getOrderForUser } from '@/services/order.service';
import { formatDateTime, formatPrice } from '@/lib/utils/format';

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { placed?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/account/orders/${params.id}`);

  const order = await getOrderForUser(user.id, params.id);
  if (!order) notFound();

  return (
    <div className="flex flex-col gap-6">
      {searchParams.placed === '1' && (
        <div className="flex items-center gap-2 rounded-lg bg-brand-50 p-4 text-sm text-brand-700">
          <CheckCircle2 className="h-5 w-5" />
          Order placed successfully! You'll pay cash on delivery.
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Link href="/account/orders" className="text-sm text-ink-400 hover:text-brand-600">
          ← Back to orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-ink-900">Order {order.orderNumber}</h1>
          <OrderStatusBadge status={order.orderStatus} />
        </div>
        <p className="text-sm text-ink-400">Placed {formatDateTime(order.createdAt)}</p>
      </div>

      <div className="rounded-lg border border-ink-100 p-5">
        <OrderTimeline status={order.orderStatus} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {order.sellerOrders.map((sellerOrder) => (
            <div key={sellerOrder.id} className="rounded-lg border border-ink-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-medium text-ink-800">{sellerOrder.store.name}</span>
                <OrderStatusBadge status={sellerOrder.status} />
              </div>
              <div className="flex flex-col gap-3">
                {sellerOrder.items.map((item) => {
                  const image = item.variant.product.images[0];
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-ink-50">
                        {image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image.url} alt={item.variant.product.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col text-sm">
                        <Link href={`/products/${item.variant.product.slug}`} className="font-medium text-ink-800 hover:text-brand-600">
                          {item.variant.product.name}
                        </Link>
                        <span className="text-ink-400">
                          Qty {item.quantity} × {formatPrice(item.priceAtPurchase)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {sellerOrder.shipment?.trackingNumber && (
                <p className="mt-3 text-xs text-ink-400">
                  Tracking: {sellerOrder.shipment.trackingNumber}
                  {sellerOrder.shipment.carrier ? ` (${sellerOrder.shipment.carrier})` : ''}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-ink-100 p-5">
            <h2 className="mb-3 font-semibold text-ink-800">Payment summary</h2>
            <div className="flex flex-col gap-2 text-sm text-ink-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {Number(order.discountTotal) > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{formatPrice(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-2 font-semibold text-ink-900">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
              <p className="pt-1 text-xs text-ink-400">
                Payment: {order.payments[0]?.provider === 'cod' ? 'Cash on Delivery' : order.payments[0]?.provider} · {order.paymentStatus}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-ink-100 p-5">
            <h2 className="mb-2 font-semibold text-ink-800">Shipping address</h2>
            <p className="text-sm text-ink-600">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}, {order.shippingAddress.city}
              {order.shippingAddress.region ? `, ${order.shippingAddress.region}` : ''}{' '}
              {order.shippingAddress.postalCode ?? ''}, {order.shippingAddress.country}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
