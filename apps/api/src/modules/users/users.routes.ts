import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { NotFoundError, UnauthorizedError } from "../../lib/errors";

export const usersRouter = Router();

usersRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        vendorProfile: { select: { status: true, businessName: true } },
      },
    });

    if (!user) throw new NotFoundError("User");

    res.json({ success: true, data: user, error: null });
  })
);

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(6).max(20).optional(),
});

usersRouter.patch(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const input = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: input,
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });

    res.json({ success: true, data: user, error: null });
  })
);
