import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { cancelOrderHandler, checkoutHandler, getOrderHandler, getOrderTimelineHandler, getOrderTransactionsHandler, listOrdersHandler } from "./orders.controller";

export const ordersRouter = Router();

ordersRouter.use(authenticate, requireRole("CUSTOMER"));

ordersRouter.post("/", checkoutHandler);
ordersRouter.get("/", listOrdersHandler);
ordersRouter.get("/:id", getOrderHandler);
ordersRouter.post("/:id/cancel", cancelOrderHandler);
ordersRouter.get("/:id/transactions", getOrderTransactionsHandler);
ordersRouter.get("/:id/timeline", getOrderTimelineHandler);
