import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import {
  addCartItemHandler,
  getCartHandler,
  removeCartItemHandler,
  updateCartItemHandler,
} from "./cart.controller";

export const cartRouter = Router();

cartRouter.use(authenticate, requireRole("CUSTOMER"));

cartRouter.get("/", getCartHandler);
cartRouter.post("/items", addCartItemHandler);
cartRouter.patch("/items/:itemId", updateCartItemHandler);
cartRouter.delete("/items/:itemId", removeCartItemHandler);
