import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import { addCartItemSchema, updateCartItemSchema } from "./cart.schemas";
import * as cartService from "./cart.service";

function requireUserId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export const getCartHandler = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(requireUserId(req));
  res.json({ success: true, data: cart, error: null });
});

export const addCartItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = addCartItemSchema.parse(req.body);
  const cart = await cartService.addItem(requireUserId(req), input);
  res.status(201).json({ success: true, data: cart, error: null });
});

export const updateCartItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = updateCartItemSchema.parse(req.body);
  const cart = await cartService.updateItem(requireUserId(req), req.params.itemId, input);
  res.json({ success: true, data: cart, error: null });
});

export const removeCartItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.removeItem(requireUserId(req), req.params.itemId);
  res.json({ success: true, data: cart, error: null });
});
