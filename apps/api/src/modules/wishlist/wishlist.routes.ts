import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { NotFoundError, UnauthorizedError } from "../../lib/errors";
import { z } from "zod";

export const wishlistRouter = Router();

wishlistRouter.use(authenticate, requireRole("CUSTOMER"));

async function getOrCreateWishlist(userId: string) {
  const existing = await prisma.wishlist.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.wishlist.create({ data: { userId } });
}

wishlistRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const wishlist = await getOrCreateWishlist(req.user.id);

    const full = await prisma.wishlist.findUniqueOrThrow({
      where: { id: wishlist.id },
      include: {
        items: {
          orderBy: { addedAt: "desc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                basePrice: true,
                currency: true,
                images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
              },
            },
          },
        },
      },
    });

    const items = full.items.map((item) => ({
      id: item.id,
      addedAt: item.addedAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: item.product.basePrice,
        currency: item.product.currency,
        image: item.product.images[0]?.url ?? null,
      },
    }));

    res.json({ success: true, data: items, error: null });
  })
);

const addWishlistItemSchema = z.object({ productId: z.string().uuid() });

wishlistRouter.post(
  "/items",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const { productId } = addWishlistItemSchema.parse(req.body);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.deletedAt) throw new NotFoundError("Product");

    const wishlist = await getOrCreateWishlist(req.user.id);

    await prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
      update: {},
      create: { wishlistId: wishlist.id, productId },
    });

    res.status(201).json({ success: true, data: { message: "Added to wishlist" }, error: null });
  })
);

wishlistRouter.delete(
  "/items/:productId",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const wishlist = await getOrCreateWishlist(req.user.id);

    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId: req.params.productId },
    });

    res.json({ success: true, data: { message: "Removed from wishlist" }, error: null });
  })
);
