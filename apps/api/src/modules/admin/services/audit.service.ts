import { prisma } from "../../../lib/prisma";

/**
 * Records a state-changing admin action for accountability. Called from
 * every admin service function that mutates something — never from
 * read-only list/get endpoints. Fire-and-forget from the caller's
 * perspective is intentionally NOT used here: if the audit write fails we
 * want that to surface, not be silently swallowed, since an admin action
 * without a trail defeats the point.
 */
export async function recordAuditLog(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
) {
  await prisma.adminAuditLog.create({
    data: { adminId, action, targetType, targetId, metadata },
  });
}
