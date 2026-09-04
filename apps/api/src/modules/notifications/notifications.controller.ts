import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import { notificationListQuerySchema } from "./notifications.schemas";
import * as notificationsService from "./notifications.service";

function uid(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export const listNotificationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = notificationListQuerySchema.parse(req.query);
  const result = await notificationsService.listNotifications(uid(req), query);
  res.json({ success: true, data: result.items, error: null, meta: { pagination: result.pagination } });
});

export const unreadCountHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.getUnreadCount(uid(req));
  res.json({ success: true, data, error: null });
});

export const markAsReadHandler = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationsService.markAsRead(uid(req), req.params.id);
  res.json({ success: true, data: notification, error: null });
});

export const markAllAsReadHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.markAllAsRead(uid(req));
  res.json({ success: true, data, error: null });
});
