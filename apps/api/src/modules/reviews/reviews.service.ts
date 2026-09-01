import { prisma } from "../../lib/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { CreateReviewInput, ReportReviewInput, UpdateReviewInput } from "./reviews.schemas";

/** Recomputes Product.averageRating / reviewCount from currently-approved
 * reviews. Called after every mutation that could change what counts as
 * "approved" for this product — create, edit (which re-enters moderation),
 * delete, and admin moderation. Kept as a plain aggregate query rather than
 * an incremental counter so it's always correct even if data drifts. */
async function recomputeProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, status: "APPROVED", deletedAt: null },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageRating: agg._count.rating > 0 ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : null,
      reviewCount: agg._count.rating,
    },
  });
}

/**
 * A review is "verified" only when the reviewer has an OrderItem for this
 * exact product with status DELIVERED — checked here from real order data,
 * never trusted from the client. We check OrderItem.status (not the parent
 * Order.status) because a multi-vendor order can have items at different
 * stages (see orders.service.ts) — the item for *this* product is what
 * matters, not the order as a whole.
 */
async function findVerifyingOrderItem(userId: string, productId: string) {
  return prisma.orderItem.findFirst({
    where: { productId, status: "DELIVERED", order: { userId } },
    orderBy: { createdAt: "desc" },
  });
}

async function getOwnReview(userId: string, reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.deletedAt) throw new NotFoundError("Review");
  if (review.userId !== userId) throw new ForbiddenError("This review does not belong to you");
  return review;
}

/**
 * DESIGN DECISION — purchase is not a hard requirement to review.
 * Any authenticated customer can leave a rating/review on any product; the
 * "Verified Purchase" badge is what carries the trust signal (computed
 * server-side), rather than blocking reviews entirely behind a purchase.
 * This matches how most marketplaces (Amazon, etc.) work, and matches the
 * schema comment on Review.orderId ("nullable because early-stage
 * moderation may allow unverified reviews"). One review per customer per
 * product is still enforced via the existing
 * Review.@@unique([productId, userId]) constraint.
 */
export async function createReview(userId: string, input: CreateReviewInput) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product || product.deletedAt) throw new NotFoundError("Product");

  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId: input.productId, userId } },
  });
  if (existing) throw new ConflictError("You have already reviewed this product");

  const verifyingOrderItem = await findVerifyingOrderItem(userId, input.productId);

  const review = await prisma.review.create({
    data: {
      productId: input.productId,
      userId,
      orderId: verifyingOrderItem?.orderId ?? null,
      rating: input.rating,
      title: input.title,
      comment: input.comment,
      isVerifiedPurchase: Boolean(verifyingOrderItem),
      // DESIGN DECISION — new reviews start PENDING and require admin
      // approval before they appear publicly (products.service.ts only
      // surfaces reviews where status = APPROVED). This mirrors how new
      // vendor accounts start PENDING and can't go live until approved
      // (see auth.service.ts / vendor.service.ts#assertCanPublish) — the
      // project's existing convention for user-submitted content that
      // needs a trust gate. There's no admin UI for this yet (Phase 10
      // builds it), but the moderation endpoint is fully functional today.
      status: "PENDING",
    },
  });

  // New reviews start PENDING, so this call has no visible effect yet —
  // kept for consistency and to keep the counter self-healing if the
  // default status convention ever changes.
  await recomputeProductRating(input.productId);

  return review;
}

/**
 * Editing a review re-enters moderation (resets status to PENDING) —
 * otherwise an approved review could be silently edited into something
 * abusive after the fact without ever being re-checked.
 */
export async function updateReview(userId: string, reviewId: string, input: UpdateReviewInput) {
  const existing = await getOwnReview(userId, reviewId);

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { ...input, status: "PENDING" },
  });

  // Resetting to PENDING drops this review out of the approved average
  // until it's re-approved — recompute so the product's rating reflects
  // that immediately, not after the next unrelated review event.
  await recomputeProductRating(existing.productId);

  return updated;
}

export async function deleteReview(userId: string, reviewId: string) {
  const existing = await getOwnReview(userId, reviewId);
  await prisma.review.update({ where: { id: reviewId }, data: { deletedAt: new Date() } });
  await recomputeProductRating(existing.productId);
}

/** Returns the current user's own review for a product (any status), or
 * null if they haven't reviewed it — this is a "check" query, not a
 * not-found error, since "no review yet" is an expected, valid state. */
export async function getMyReview(userId: string, productId: string) {
  return prisma.review.findUnique({
    where: { productId_userId: { productId, userId } },
  });
}

// ---- REPORTING --------------------------------------------------------

export async function reportReview(userId: string, reviewId: string, input: ReportReviewInput) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.deletedAt) throw new NotFoundError("Review");

  if (review.userId === userId) {
    throw new ForbiddenError("You cannot report your own review");
  }

  const existing = await prisma.reviewReport.findUnique({
    where: { reviewId_reporterId: { reviewId, reporterId: userId } },
  });
  if (existing) throw new ConflictError("You have already reported this review");

  const report = await prisma.reviewReport.create({
    data: {
      reviewId,
      reporterId: userId,
      reason: input.reason,
      details: input.details,
      status: "PENDING",
    },
  });

  return report;
}

// ---- MODERATION (admin) ------------------------------------------------

/** Used by the admin module (admin.controller.ts) — kept here alongside the
 * rest of Review data access rather than duplicated, the same way
 * vendor.controller.ts reuses orders.schemas directly across modules. */
export async function moderateReviewStatus(reviewId: string, status: "APPROVED" | "REJECTED") {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.deletedAt) throw new NotFoundError("Review");

  const updated = await prisma.review.update({ where: { id: reviewId }, data: { status } });
  await recomputeProductRating(review.productId);
  return updated;
}
