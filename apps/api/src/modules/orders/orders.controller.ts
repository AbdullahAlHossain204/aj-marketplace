import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import { checkoutSchema, orderListQuerySchema } from "./orders.schemas";
import * as ordersService from "./orders.service";

function uid(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export const checkoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = checkoutSchema.parse(req.body);
  const order = await ordersService.checkout(uid(req), input);
  res.status(201).json({ success: true, data: order, error: null });
});

export const listOrdersHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = orderListQuerySchema.parse(req.query);
  const result = await ordersService.listOrders(uid(req), query);
  res.json({ success: true, data: result.items, error: null, meta: { pagination: result.pagination } });
});

export const getOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const order = await ordersService.getOrder(uid(req), req.params.id);
  res.json({ success: true, data: order, error: null });
});

export const cancelOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const order = await ordersService.cancelOrder(uid(req), req.params.id);
  res.json({ success: true, data: order, error: null });
});

export const getOrderTransactionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const transactions = await ordersService.getOrderTransactions(uid(req), req.params.id);
  res.json({ success: true, data: transactions, error: null });
});
