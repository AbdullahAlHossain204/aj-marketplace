import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { healthRouter } from "./modules/health/health.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { productsRouter } from "./modules/products/products.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { cartRouter } from "./modules/cart/cart.routes";
import { wishlistRouter } from "./modules/wishlist/wishlist.routes";
import { addressesRouter } from "./modules/addresses/addresses.routes";
import { vendorRouter } from "./modules/vendor/vendor.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { reviewsRouter } from "./modules/reviews/reviews.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp(): Application {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS — only allow the configured frontend origin, with credentials
  // (needed for httpOnly refresh cookie) enabled.
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Body/cookie parsing
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Request logging
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  // Basic global rate limiting — tightened per-route later (e.g. login).
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Routes
  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1/products", productsRouter);
  app.use("/api/v1/categories", categoriesRouter);
  app.use("/api/v1/cart", cartRouter);
  app.use("/api/v1/wishlist", wishlistRouter);
  app.use("/api/v1/addresses", addressesRouter);
  app.use("/api/v1/vendor", vendorRouter);
  app.use("/api/v1/orders", ordersRouter);
  app.use("/api/v1/reviews", reviewsRouter);
  app.use("/api/v1/notifications", notificationsRouter);

  // 404 + error handling — must be registered last, in this order.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
