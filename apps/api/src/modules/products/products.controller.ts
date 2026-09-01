import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { productListQuerySchema, suggestQuerySchema } from "./products.schemas";
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

export const getSuggestionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { q } = suggestQuerySchema.parse(req.query);
  const result = await productsService.getSuggestions(q);
  res.json({ success: true, data: result, error: null });
});

export const listBrandsHandler = asyncHandler(async (req: Request, res: Response) => {
  const brands = await productsService.listBrands();
  res.json({ success: true, data: brands, error: null });
});
