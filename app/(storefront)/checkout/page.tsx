import { redirect } from 'next/navigation';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CartSummary } from '@/components/cart/cart-summary';
import { getCurrentUser } from '@/lib/auth/session';
import { computeCartSummary, getCart } from '@/services/cart.service';
import { listAddresses } from '@/services/address.service';

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/checkout');

  const [cart, addresses] = await Promise.all([getCart(user.id), listAddresses(user.id)]);
  if (cart.items.length === 0) redirect('/cart');

  const { subtotal, itemCount } = computeCartSummary(cart);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink-900">Checkout</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <CheckoutForm
          addresses={addresses.map((a) => ({
            id: a.id,
            label: a.label,
            line1: a.line1,
            line2: a.line2,
            city: a.city,
            region: a.region,
            postalCode: a.postalCode,
            country: a.country,
            phone: a.phone,
            isDefault: a.isDefault,
          }))}
          subtotal={subtotal}
        />
        <div>
          <CartSummary subtotal={subtotal} itemCount={itemCount} showCheckoutButton={false} />
        </div>
      </div>
    </div>
  );
}
