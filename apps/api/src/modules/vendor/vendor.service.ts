import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { notifyOrderStatusChanged } from "../notifications/notifications.service";
import {
  AddImageInput,
  CreateProductInput,
  CreateStoreInput,
  UpdateInventoryInput,
  UpdateProductInput,
  UpdateStoreInput,
  VendorProductListQuery,
} from "./vendor.schemas";

/** Every vendor action is scoped through their VendorProfile + Store — this
 * is the single choke point that guarantees a vendor can never read or
 * modify another vendor's data. */
async function getOwnVendorProfile(userId: string) {
  const profile = await prisma.vendorProfile.findUnique({ where: { userId }, include: { store: true } });
  if (!profile) throw new NotFoundError("Vendor profile");
  return profile;
}

async function getOwnStore(userId: string) {
  const profile = await getOwnVendorProfile(userId);
  if (!profile.store) throw new NotFoundError("Store — create one first");
  return { profile, store: profile.store };
}

// ---- STORE ------------------------------------------------------------

export async function getMyStore(userId: string) {
  const { profile, store } = await getOwnStore(userId);
  return { ...store, vendorStatus: profile.status };
}

export async function createMyStore(userId: string, input: CreateStoreInput) {
  const profile = await getOwnVendorProfile(userId);
  if (profile.store) throw new ConflictError("You already have a store");

  const existingSlug = await prisma.store.findUnique({ where: { slug: input.slug } });
  if (existingSlug) throw new ConflictError("This store URL is already taken");

  const store = await prisma.store.create({
    data: { ...input, vendorProfileId: profile.id },
  });

  return { ...store, vendorStatus: profile.status };
}

export async function updateMyStore(userId: string, input: UpdateStoreInput) {
  const { store } = await getOwnStore(userId);
  const updated = await prisma.store.update({ where: { id: store.id }, data: input });
  return updated;
}

// ---- PRODUCTS -----------------------------------------------------------

/** Products can be saved as DRAFT any time, but going ACTIVE (publicly
 * visible) requires the vendor to be admin-approved — this lets a new
 * vendor build their catalog while their application is under review. */
function assertCanPublish(vendorStatus: string, status?: string) {
  if (status === "ACTIVE" && vendorStatus !== "APPROVED") {
    throw new ForbiddenError("Your vendor account must be approved before products can go live");
  }
}

export async function listMyProducts(userId: string, query: VendorProductListQuery) {
  const { store } = await getOwnStore(userId);

  const where = { storeId: store.id, deletedAt: null, ...(query.status && { status: query.status }) };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { include: { inventory: true } },
        category: { select: { name: true, slug: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function getMyProduct(userId: string, productId: string) {
  const { store } = await getOwnStore(userId);
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { include: { inventory: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!product || product.deletedAt) throw new NotFoundError("Product");
  if (product.storeId !== store.id) throw new ForbiddenError("This product does not belong to your store");

  return product;
}

export async function createMyProduct(userId: string, input: CreateProductInput) {
  const { profile, store } = await getOwnStore(userId);
  assertCanPublish(profile.status, input.status);

  const existingSlug = await prisma.product.findUnique({ where: { slug: input.slug } });
  if (existingSlug) throw new ConflictError("A product with this URL slug already exists");

  const skus = input.variants.map((v) => v.sku);
  const existingSkus = await prisma.productVariant.findMany({ where: { sku: { in: skus } } });
  if (existingSkus.length > 0) {
    throw new ConflictError(`SKU(s) already in use: ${existingSkus.map((v) => v.sku).join(", ")}`);
  }

  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: input.categoryId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      basePrice: input.basePrice,
      currency: input.currency,
      status: input.status,
      images: { create: input.images.map((img, i) => ({ ...img, position: i })) },
      variants: {
        create: input.variants.map((v) => ({
          name: v.name,
          sku: v.sku,
          priceDelta: v.priceDelta,
          attributes: v.attributes,
          inventory: { create: { quantity: v.quantity } },
        })),
      },
    },
    include: { images: true, variants: { include: { inventory: true } } },
  });

  return product;
}

export async function updateMyProduct(userId: string, productId: string, input: UpdateProductInput) {
  const { profile, store } = await getOwnStore(userId);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.deletedAt) throw new NotFoundError("Product");
  if (product.storeId !== store.id) throw new ForbiddenError("This product does not belong to your store");

  assertCanPublish(profile.status, input.status);

  const updated = await prisma.product.update({
    where: { id: productId },
    data: input,
    include: { images: true, variants: { include: { inventory: true } } },
  });

  return updated;
}

export async function deleteMyProduct(userId: string, productId: string) {
  const { store } = await getOwnStore(userId);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.deletedAt) throw new NotFoundError("Product");
  if (product.storeId !== store.id) throw new ForbiddenError("This product does not belong to your store");

  await prisma.product.update({ where: { id: productId }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
}

// ---- IMAGES ---------------------------------------------------------------

async function assertOwnsProduct(userId: string, productId: string) {
  const { store } = await getOwnStore(userId);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.deletedAt) throw new NotFoundError("Product");
  if (product.storeId !== store.id) throw new ForbiddenError("This product does not belong to your store");
  return product;
}

export async function addProductImage(userId: string, productId: string, input: AddImageInput) {
  await assertOwnsProduct(userId, productId);
  return prisma.productImage.create({ data: { productId, ...input } });
}

export async function removeProductImage(userId: string, productId: string, imageId: string) {
  await assertOwnsProduct(userId, productId);
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) throw new NotFoundError("Image");
  await prisma.productImage.delete({ where: { id: imageId } });
}

// ---- INVENTORY --------------------------------------------------------------

export async function updateVariantInventory(
  userId: string,
  productId: string,
  variantId: string,
  input: UpdateInventoryInput
) {
  await assertOwnsProduct(userId, productId);

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { inventory: true } });
  if (!variant || variant.deletedAt || variant.productId !== productId) throw new NotFoundError("Variant");

  if (!variant.inventory) {
    throw new AppError("This variant has no inventory record", 500);
  }

  return prisma.inventoryRecord.update({
    where: { productVariantId: variantId },
    data: input,
  });
}

// ---- DASHBOARD ------------------------------------------------------------

export async function getDashboardOverview(userId: string) {
  const { profile, store } = await getOwnStore(userId);

  const products = await prisma.product.findMany({
    where: { storeId: store.id, deletedAt: null },
    include: { variants: { include: { inventory: true } } },
  });

  const activeCount = products.filter((p) => p.status === "ACTIVE").length;
  const draftCount = products.filter((p) => p.status === "DRAFT").length;

  let totalStockUnits = 0;
  let lowStockVariants = 0;

  for (const p of products) {
    for (const v of p.variants) {
      const available = Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0));
      totalStockUnits += available;
      if (v.inventory && available <= v.inventory.lowStockThreshold) lowStockVariants += 1;
    }
  }

  // Store-level rating: the average rating across every APPROVED review on
  // every product in this store — computed on-the-fly from the reviews
  // relation, same as product-level averageRating() in products.service.ts,
  // rather than a cached/denormalized figure (no stated performance need
  // for caching yet).
  const productIds = products.map((p) => p.id);
  const reviewAggregate =
    productIds.length > 0
      ? await prisma.review.aggregate({
          where: { productId: { in: productIds }, status: "APPROVED", deletedAt: null },
          _avg: { rating: true },
          _count: { rating: true },
        })
      : null;

  const storeRating =
    reviewAggregate?._avg.rating != null ? Math.round(reviewAggregate._avg.rating * 10) / 10 : null;

  // Order/sales figures, scoped to this store's own line items (a single
  // marketplace order can span multiple vendors — see OrderItem's comment
  // on storeId denormalization). CANCELLED items are excluded from
  // revenue; a not-yet-DELIVERED item still counts as an order but its
  // lineTotal isn't "earned" revenue yet, so this is closer to gross
  // bookings than recognized revenue — fine for a vendor-facing snapshot.
  const orderItemAggregate = await prisma.orderItem.aggregate({
    where: { storeId: store.id, status: { not: "CANCELLED" } },
    _count: { id: true },
    _sum: { lineTotal: true },
  });

  return {
    store: { id: store.id, name: store.name, slug: store.slug, isActive: store.isActive },
    vendorStatus: profile.status,
    productCount: products.length,
    activeProductCount: activeCount,
    draftProductCount: draftCount,
    totalStockUnits,
    lowStockVariants,
    storeRating,
    storeReviewCount: reviewAggregate?._count.rating ?? 0,
    totalOrders: orderItemAggregate._count.id,
    totalRevenue: orderItemAggregate._sum.lineTotal ?? 0,
  };
}

// ---- ORDERS (vendor's slice of each order) ---------------------------------

const VENDOR_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function listMyOrders(userId: string) {
  const { store } = await getOwnStore(userId);
  const items = await prisma.orderItem.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { orderNumber: true, createdAt: true, paymentMethod: true, paymentStatus: true } },
    },
  });
  return items;
}

export async function updateOrderItemStatus(userId: string, orderItemId: string, newStatus: string) {
  const { store } = await getOwnStore(userId);

  const item = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
  if (!item) throw new NotFoundError("Order item");
  if (item.storeId !== store.id) throw new ForbiddenError("This order item does not belong to your store");

  const allowedNext = VENDOR_STATUS_TRANSITIONS[item.status] ?? [];
  if (!allowedNext.includes(newStatus)) {
    throw new AppError(`Cannot move an order item from ${item.status} to ${newStatus}`, 409);
  }

  const updated = await prisma.orderItem.update({ where: { id: orderItemId }, data: { status: newStatus } });

  // Recompute the parent order's overall status: if every item now shares
  // the same status, reflect that; otherwise the order is in a mixed state
  // (some vendors further along than others), shown as PROCESSING.
  const siblings = await prisma.orderItem.findMany({ where: { orderId: item.orderId } });
  const allSameStatus = siblings.every((i: any) => i.status === newStatus);
  const order = await prisma.order.update({
    where: { id: item.orderId },
    data: { status: allSameStatus ? newStatus : "PROCESSING" },
  });

  // Note: a vendor-initiated CANCELLED transition here is a distinct event
  // from customer/admin-initiated cancellation (orders.service.ts#
  // performOrderCancellation, which sends its own ORDER_CANCELLED
  // notification and releases stock) — this is a single line item, vendor
  // decides, no stock release logic lives on this path. Both are worth
  // their own signal, so this fires unconditionally for every transition.
  await notifyOrderStatusChanged({
    userId: order.userId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    productName: updated.productNameSnapshot,
    newStatus,
  });

  return updated;
}
