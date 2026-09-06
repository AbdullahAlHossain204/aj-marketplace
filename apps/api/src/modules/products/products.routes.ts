import { Router } from "express";
import {
  getProductHandler,
  getSuggestionsHandler,
  listBrandsHandler,
  listProductsHandler,
} from "./products.controller";

export const productsRouter = Router();

// Static routes MUST be registered before "/:slug", or Express will match
// "suggestions"/"brands" as a slug value instead of these handlers.
productsRouter.get("/suggestions", getSuggestionsHandler);
productsRouter.get("/brands", listBrandsHandler);
productsRouter.get("/", listProductsHandler);
productsRouter.get("/:slug", getProductHandler);
