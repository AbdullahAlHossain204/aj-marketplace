import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  listNotificationsHandler,
  markAllAsReadHandler,
  markAsReadHandler,
  unreadCountHandler,
} from "./notifications.controller";

export const notificationsRouter = Router();

// No requireRole restriction — customers, vendors, and admins all receive
// notifications and this module only ever reads/writes the caller's own
// rows (see notifications.service.ts's ownership checks).
notificationsRouter.use(authenticate);

notificationsRouter.get("/", listNotificationsHandler);
notificationsRouter.get("/unread-count", unreadCountHandler);
notificationsRouter.patch("/read-all", markAllAsReadHandler);
notificationsRouter.patch("/:id/read", markAsReadHandler);
