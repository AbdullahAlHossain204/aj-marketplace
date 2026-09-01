import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";
import { AdminReportListQuery } from "../admin.schemas";
import { recordAuditLog } from "./audit.service";

export async function listReports(query: AdminReportListQuery) {
  const where = { ...(query.status && { status: query.status }) };

  const [items, total] = await Promise.all([
    prisma.reviewReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        review: {
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            status: true,
            userId: true,
            user: { select: { name: true } },
            product: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    prisma.reviewReport.count({ where }),
  ]);

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

/**
 * Triages a report itself (RESOLVED/DISMISSED) — separate from moderating
 * the underlying review (that stays on the existing
 * PATCH /admin/reviews/:id/status endpoint from Phase 8). Kept decoupled
 * deliberately: an admin might resolve a report by taking the review down,
 * or by dismissing the report as unfounded and leaving the review as-is —
 * either way the two actions are independent and shouldn't be silently
 * coupled together.
 */
export async function setReportStatus(adminId: string, reportId: string, status: "RESOLVED" | "DISMISSED") {
  const report = await prisma.reviewReport.findUnique({ where: { id: reportId } });
  if (!report) throw new NotFoundError("Review report");

  const updated = await prisma.reviewReport.update({ where: { id: reportId }, data: { status } });

  await recordAuditLog(adminId, "REVIEW_REPORT_TRIAGE", "ReviewReport", reportId, { status });

  return updated;
}
