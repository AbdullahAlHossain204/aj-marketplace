import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as vendorService from "./vendor.service";
import {
  addImageSchema,
  createProductSchema,
  createStoreSchema,
  productListQuerySchema,
  updateInventorySchema,
  updateProductSchema,
  updateStoreSchema,
} from "./vendor.schemas";
import { updateOrderItemStatusSchema } from "../orders/orders.schemas";

function uid(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export const getStoreHandler = asyncHandler(async (req: Request, res: Response) => {
  const store = await vendorService.getMyStore(uid(req));
  res.json({ success: true, data: store, error: null });
});

export const createStoreHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = createStoreSchema.parse(req.body);
  const store = await vendorService.createMyStore(uid(req), input);
  res.status(201).json({ success: true, data: store, error: null });
});

export const updateStoreHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = updateStoreSchema.parse(req.body);
  const store = await vendorService.updateMyStore(uid(req), input);
  res.json({ success: true, data: store, error: null });
});

export const listProductsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = productListQuerySchema.parse(req.query);
  const result = await vendorService.listMyProducts(uid(req), query);
  res.json({ success: true, data: result.items, error: null, meta: { pagination: result.pagination } });
});

export const getProductHandler = asyncHandler(async (req: Request, res: Response) => {
  const product = await vendorService.getMyProduct(uid(req), req.params.id);
  res.json({ success: true, data: product, error: null });
});

export const createProductHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = createProductSchema.parse(req.body);
  const product = await vendorService.createMyProduct(uid(req), input);
  res.status(201).json({ success: true, data: product, error: null });
});

export const updateProductHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = updateProductSchema.parse(req.body);
  const product = await vendorService.updateMyProduct(uid(req), req.params.id, input);
  res.json({ success: true, data: product, error: null });
});

export const deleteProductHandler = asyncHandler(async (req: Request, res: Response) => {
  await vendorService.deleteMyProduct(uid(req), req.params.id);
  res.json({ success: true, data: { message: "Product deleted" }, error: null });
});

export const addImageHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = addImageSchema.parse(req.body);
  const image = await vendorService.addProductImage(uid(req), req.params.id, input);
  res.status(201).json({ success: true, data: image, error: null });
});

export const removeImageHandler = asyncHandler(async (req: Request, res: Response) => {
  await vendorService.removeProductImage(uid(req), req.params.id, req.params.imageId);
  res.json({ success: true, data: { message: "Image removed" }, error: null });
});

export const updateInventoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = updateInventorySchema.parse(req.body);
  const inventory = await vendorService.updateVariantInventory(uid(req), req.params.id, req.params.variantId, input);
  res.json({ success: true, data: inventory, error: null });
});

export const dashboardHandler = asyncHandler(async (req: Request, res: Response) => {
  const overview = await vendorService.getDashboardOverview(uid(req));
  res.json({ success: true, data: overview, error: null });
});

export const listOrdersHandler = asyncHandler(async (req: Request, res: Response) => {
  const orders = await vendorService.listMyOrders(uid(req));
  res.json({ success: true, data: orders, error: null });
});

export const updateOrderItemStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = updateOrderItemStatusSchema.parse(req.body);
  const item = await vendorService.updateOrderItemStatus(uid(req), req.params.orderItemId, input.status);
  res.json({ success: true, data: item, error: null });
});
