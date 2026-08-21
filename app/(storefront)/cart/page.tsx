import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CartItemRow } from '@/components/cart/cart-item-row';
import { CartSummary } from '@/components/cart/cart-summary';
import { getCurrentUser } from '@/lib/auth/session';
import { computeCartSummary, getCart } from '@/services/cart.service';

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/cart');

  const cart = await getCart(user.id);
  const { subtotal, itemCount } = computeCartSummary(cart);

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-ink-900">Your cart is empty</h1>
        <p className="text-ink-500">Browse the catalog and add something you like.</p>
        <Link href="/search">
          <Button>Start shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink-900">Your cart</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-ink-100 px-4">
          {cart.items.map((item) => (
            <CartItemRow
              key={item.id}
              item={{
                id: item.id,
                quantity: item.quantity,
                variant: {
                  id: item.variant.id,
                  price: item.variant.price,
                  attributes: (item.variant.attributes as Record<string, string>) ?? {},
                  inventory: item.variant.inventory
                    ? { quantity: item.variant.inventory.quantity, reserved: item.variant.inventory.reserved }
                    : null,
                  product: {
                    name: item.variant.product.name,
                    slug: item.variant.product.slug,
                    images: item.variant.product.images,
                    store: item.variant.product.store,
                  },
                },
              }}
            />
          ))}
        </div>
        <div>
          <CartSummary subtotal={subtotal} itemCount={itemCount} />
        </div>
      </div>
    </div>
  );
}
