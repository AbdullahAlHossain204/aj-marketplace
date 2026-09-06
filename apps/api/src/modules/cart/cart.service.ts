import { prisma } from "../../lib/prisma";
import { AppError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { AddCartItemInput, UpdateCartItemInput } from "./cart.schemas";
import { computeEffectivePrice } from "../marketing/pricing";
import { getActiveFlashSalesForProducts } from "../marketing/marketing.service";

async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

/** Prices shown/totaled in the cart must match what checkout will actually
 * charge (see orders.service.ts#checkout) — both go through the same
 * computeEffectivePrice() so a flash sale ending between "view cart" and
 * "place order" is the only thing that can ever change the number. */
async function shapeCart(cart: {
  id: string;
  items: {
    id: string;
    quantity: number;
    productId: string;
    product: { id: string; name: string; slug: string; basePrice: number; compareAtPrice: number | null; currency: string; images: { url: string }[] };
    productVariant: { id: string; name: string; priceDelta: number; inventory: { quantity: number; reservedQuantity: number } | null };
  }[];
}) {
  const flashSales = await getActiveFlashSalesForProducts(cart.items.map((i) => i.productId));

  const items = cart.items.map((item) => {
    const variantBase = item.product.basePrice + item.productVariant.priceDelta;
    const effective = computeEffectivePrice(variantBase, null, flashSales.get(item.productId) ?? null);
    const unitPrice = effective.price;
    const available = Math.max(
      0,
      (item.productVariant.inventory?.quantity ?? 0) - (item.productVariant.inventory?.reservedQuantity ?? 0)
    );
    return {
      id: item.id,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      currency: item.product.currency,
      onSale: effective.activeFlashSale !== null,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.images[0]?.url ?? null,
      },
      variant: { id: item.productVariant.id, name: item.productVariant.name },
      available,
      exceedsStock: item.quantity > available,
    };
  });

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  return { id: cart.id, items, subtotal, itemCount: items.reduce((sum, i) => sum + i.quantity, 0) };
}

const cartInclude = {
  items: {
    orderBy: { addedAt: "asc" as const },
    include: {
      product: { select: { id: true, name: true, slug: true, basePrice: true, compareAtPrice: true, currency: true, images: { take: 1, orderBy: { position: "asc" as const }, select: { url: true } } } },
      productVariant: { include: { inventory: true } },
    },
  },
};

export async function getCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  const full = await prisma.cart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
  return shapeCart(full);
}

export async function addItem(userId: string, input: AddCartItemInput) {
  const cart = await getOrCreateCart(userId);

  const variant = await prisma.productVariant.findUnique({
    where: { id: input.productVariantId },
    include: { inventory: true, product: true },
  });

  if (!variant || variant.deletedAt || variant.product.status !== "ACTIVE" || variant.product.deletedAt) {
    throw new NotFoundError("Product variant");
  }

  const existingItem = await prisma.cartItem.findUnique({
    where: { cartId_productVariantId: { cartId: cart.id, productVariantId: variant.id } },
  });

  const requestedTotal = (existingItem?.quantity ?? 0) + input.quantity;
  const available = Math.max(0, (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0));

  if (requestedTotal > available) {
    throw new AppError(`Only ${available} unit(s) of this item are available`, 409);
  }

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: requestedTotal },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: variant.productId,
        productVariantId: variant.id,
        quantity: input.quantity,
      },
    });
  }

  return getCart(userId);
}

export async function updateItem(userId: string, itemId: string, input: UpdateCartItemInput) {
  const cart = await getOrCreateCart(userId);
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { productVariant: { include: { inventory: true } } },
  });

  if (!item) throw new NotFoundError("Cart item");
  if (item.cartId !== cart.id) throw new ForbiddenError("This item does not belong to your cart");

  if (input.quantity === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return getCart(userId);
  }

  const available = Math.max(
    0,
    (item.productVariant.inventory?.quantity ?? 0) - (item.productVariant.inventory?.reservedQuantity ?? 0)
  );
  if (input.quantity > available) {
    throw new AppError(`Only ${available} unit(s) of this item are available`, 409);
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: input.quantity } });
  return getCart(userId);
}

export async function removeItem(userId: string, itemId: string) {
  const cart = await getOrCreateCart(userId);
  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });

  if (!item) throw new NotFoundError("Cart item");
  if (item.cartId !== cart.id) throw new ForbiddenError("This item does not belong to your cart");

  await prisma.cartItem.delete({ where: { id: itemId } });
  return getCart(userId);
}
