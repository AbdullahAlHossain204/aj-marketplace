import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { productListQuerySchema } from "./products.schemas";
import * as productsService from "./products.service";

export const listProductsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = productListQuerySchema.parse(req.query);
  const result = await productsService.listProducts(query);

  res.json({
    success: true,
    data: result.items,
    error: null,
    meta: { pagination: result.pagination },
  });
});

export const getProductHandler = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.getProductBySlug(req.params.slug);
  res.json({ success: true, data: product, error: null });
});
