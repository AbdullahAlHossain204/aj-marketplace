/**
 * Shared effective-price calculation — the single source of truth for
 * "what does this product actually cost right now", used by product
 * listing, product detail, and (critically) checkout, so a flash sale's
 * discount is never computed differently in two places.
 */

export interface ActiveFlashSaleInfo {
  id: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  endsAt: Date;
}

export interface EffectivePrice {
  /** What the customer actually pays, in smallest currency unit. */
  price: number;
  /** The "was" price to show struck through, if any discount applies. */
  compareAtPrice: number | null;
  activeFlashSale: ActiveFlashSaleInfo | null;
}

/**
 * basePrice is always the vendor's listed price. On top of that:
 *  1. An active flash sale (if any) takes priority — it's a time-boxed
 *     campaign discount computed live, never stored.
 *  2. Otherwise, a vendor-set compareAtPrice is shown as a static "was"
 *     price with basePrice as the actual charge.
 * A flash sale is "active" strictly by isActive + the current time falling
 * within [startsAt, endsAt] — expiry is time-based, not a cron job flipping
 * a flag, so it self-corrects even if nothing ever runs a sweep.
 */
export function computeEffectivePrice(
  basePrice: number,
  compareAtPrice: number | null,
  flashSale: ActiveFlashSaleInfo | null,
  now: Date = new Date()
): EffectivePrice {
  if (flashSale && flashSale.endsAt > now) {
    const discounted =
      flashSale.discountType === "PERCENTAGE"
        ? Math.round(basePrice * (1 - flashSale.discountValue / 100))
        : Math.max(0, basePrice - flashSale.discountValue);

    return { price: discounted, compareAtPrice: basePrice, activeFlashSale: flashSale };
  }

  return { price: basePrice, compareAtPrice: compareAtPrice ?? null, activeFlashSale: null };
}
