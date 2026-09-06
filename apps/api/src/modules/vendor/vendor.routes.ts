import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import {
  addImageHandler,
  createProductHandler,
  createStoreHandler,
  dashboardHandler,
  deleteProductHandler,
  getProductHandler,
  getStoreHandler,
  listOrdersHandler,
  listProductsHandler,
  removeImageHandler,
  updateInventoryHandler,
  updateOrderItemStatusHandler,
  setShippingInfoHandler,
  updateProductHandler,
  updateStoreHandler,
} from "./vendor.controller";

export const vendorRouter = Router();

vendorRouter.use(authenticate, requireRole("VENDOR"));

vendorRouter.get("/dashboard", dashboardHandler);

vendorRouter.get("/store", getStoreHandler);
vendorRouter.post("/store", createStoreHandler);
vendorRouter.patch("/store", updateStoreHandler);

vendorRouter.get("/products", listProductsHandler);
vendorRouter.post("/products", createProductHandler);
vendorRouter.get("/products/:id", getProductHandler);
vendorRouter.patch("/products/:id", updateProductHandler);
vendorRouter.delete("/products/:id", deleteProductHandler);

vendorRouter.post("/products/:id/images", addImageHandler);
vendorRouter.delete("/products/:id/images/:imageId", removeImageHandler);

vendorRouter.patch("/products/:id/variants/:variantId/inventory", updateInventoryHandler);

vendorRouter.get("/orders", listOrdersHandler);
vendorRouter.patch("/orders/:orderItemId/status", updateOrderItemStatusHandler);
vendorRouter.patch("/orders/:orderItemId/shipping", setShippingInfoHandler);
