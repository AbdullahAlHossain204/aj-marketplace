import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";

export const adminRouter = Router();

/**
 * Placeholder — proves role-based access control works end to end.
 * Real admin endpoints (user/vendor/product management) are built in Phase 10.
 */
adminRouter.get("/ping", authenticate, requireRole("ADMIN"), (req, res) => {
  res.json({ success: true, data: { message: "Admin access confirmed" }, error: null });
});
