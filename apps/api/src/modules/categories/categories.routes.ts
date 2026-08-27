import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";

export const categoriesRouter = Router();

/**
 * Returns top-level categories with their direct children, for building
 * the main navigation / homepage category grid. Deeper nesting can be
 * fetched on demand via a future `/categories/:slug` endpoint if needed.
 */
categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { parentId: null, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        children: {
          where: { isActive: true, deletedAt: null },
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true, imageUrl: true },
        },
      },
    });

    res.json({ success: true, data: categories, error: null });
  })
);
