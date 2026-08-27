import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { addressSchema, updateAddressSchema } from "./addresses.schemas";

export const addressesRouter = Router();

addressesRouter.use(authenticate);

addressesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    res.json({ success: true, data: addresses, error: null });
  })
);

addressesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const input = addressSchema.parse(req.body);

    // If this is set as default (or it's the user's first address), clear
    // any other default so there's always exactly one.
    const existingCount = await prisma.address.count({ where: { userId: req.user.id, deletedAt: null } });
    const shouldBeDefault = input.isDefault || existingCount === 0;

    if (shouldBeDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: { ...input, userId: req.user.id, isDefault: shouldBeDefault },
    });

    res.status(201).json({ success: true, data: address, error: null });
  })
);

async function assertOwnedAddress(userId: string, addressId: string) {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.deletedAt) throw new NotFoundError("Address");
  if (address.userId !== userId) throw new ForbiddenError("This address does not belong to you");
  return address;
}

addressesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    await assertOwnedAddress(req.user.id, req.params.id);
    const input = updateAddressSchema.parse(req.body);

    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({ where: { id: req.params.id }, data: input });
    res.json({ success: true, data: address, error: null });
  })
);

addressesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const address = await assertOwnedAddress(req.user.id, req.params.id);

    await prisma.address.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });

    // If we just deleted the default address, promote the most recent
    // remaining one so the user always has a default when one exists.
    if (address.isDefault) {
      const next = await prisma.address.findFirst({
        where: { userId: req.user.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (next) {
        await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }

    res.json({ success: true, data: { message: "Address deleted" }, error: null });
  })
);
