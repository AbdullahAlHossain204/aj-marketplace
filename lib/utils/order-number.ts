// Human-readable, sortable order numbers. Not used as a security token
// anywhere (the DB `id` cuid is the real key) — this is display-only, so a
// timestamp + short random suffix is sufficient and avoids a DB round-trip
// (e.g. a sequence table) on the hot checkout path.
export function generateOrderNumber(): string {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AJ-${datePart}-${randomPart}`;
}
