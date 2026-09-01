import { prisma } from "../../../lib/prisma";
import { ConflictError, NotFoundError } from "../../../lib/errors";
import { CreateCategoryInput, UpdateCategoryInput } from "../admin.schemas";
import { recordAuditLog } from "./audit.service";

/**
 * Categories are the one catalog concept with no vendor-facing owner —
 * products.service.ts's categoriesRouter only exposes a public read-only
 * list. Admin gets full CRUD here since there's no other authority for it.
 */
export async function listAllCategories() {
  return prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true, children: true } },
    },
  });
}

export async function createCategory(adminId: string, input: CreateCategoryInput) {
  const existingSlug = await prisma.category.findUnique({ where: { slug: input.slug } });
  if (existingSlug) throw new ConflictError("A category with this slug already exists");

  if (input.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.deletedAt) throw new NotFoundError("Parent category");
  }

  const category = await prisma.category.create({ data: input });
  await recordAuditLog(adminId, "CATEGORY_CREATE", "Category", category.id);
  return category;
}

export async function updateCategory(adminId: string, categoryId: string, input: UpdateCategoryInput) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.deletedAt) throw new NotFoundError("Category");

  if (input.parentId) {
    if (input.parentId === categoryId) throw new ConflictError("A category cannot be its own parent");
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.deletedAt) throw new NotFoundError("Parent category");
  }

  const updated = await prisma.category.update({ where: { id: categoryId }, data: input });
  await recordAuditLog(adminId, "CATEGORY_UPDATE", "Category", categoryId);
  return updated;
}

export async function deleteCategory(adminId: string, categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.deletedAt) throw new NotFoundError("Category");

  const productCount = await prisma.product.count({ where: { categoryId, deletedAt: null } });
  if (productCount > 0) {
    throw new ConflictError(
      `Cannot delete a category with ${productCount} active product(s) — move or archive them first`
    );
  }

  await prisma.category.update({ where: { id: categoryId }, data: { deletedAt: new Date(), isActive: false } });
  await recordAuditLog(adminId, "CATEGORY_DELETE", "Category", categoryId);
}
