import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { moderateReviewHandler } from "./admin.controller";

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole("ADMIN"));

/**
 * Placeholder — proves role-based access control works end to end.
 * Real admin endpoints (user/vendor/product management) are built in Phase 10.
 */
adminRouter.get("/ping", (req, res) => {
  res.json({ success: true, data: { message: "Admin access confirmed" }, error: null });
});

/**
 * Review moderation (Phase 8). No admin UI exists yet — that's Phase 10 —
 * but the endpoint itself is fully functional and testable today, the same
 * way the vendor-approval gate was built ahead of its own admin UI.
 */
adminRouter.patch("/reviews/:id/status", moderateReviewHandler);
