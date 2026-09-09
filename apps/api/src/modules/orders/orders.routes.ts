import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { cancelOrderHandler, checkoutHandler, getOrderHandler, getOrderTimelineHandler, getOrderTransactionsHandler, listOrdersHandler } from "./orders.controller";

export const ordersRouter = Router();

ordersRouter.use(authenticate, requireRole("CUSTOMER"));

// Checkout triggers a real payment charge (payments.service.ts#chargeForCheckout)
// — the generous 300/15min global limit in app.ts is too loose for an
// endpoint that moves money. A tighter, dedicated limit here mirrors the
// pattern already used for auth.routes.ts's login/register endpoints.
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: { message: "Too many checkout attempts. Please wait a few minutes and try again." },
  },
});

ordersRouter.post("/", checkoutLimiter, checkoutHandler);
ordersRouter.get("/", listOrdersHandler);
ordersRouter.get("/:id", getOrderHandler);
ordersRouter.post("/:id/cancel", cancelOrderHandler);
ordersRouter.get("/:id/transactions", getOrderTransactionsHandler);
ordersRouter.get("/:id/timeline", getOrderTimelineHandler);
