import { Button } from '@/components/ui/button';

// This is a Phase 2 (Foundation) placeholder confirming the app boots with
// the design system wired up. The real homepage (hero, categories, flash
// deals, trending products, etc. per spec section 5) is built in Phase 3.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="text-sm font-medium uppercase tracking-wide text-brand-600">
        AJ Marketplace
      </span>
      <h1 className="text-3xl font-semibold text-ink-900 sm:text-4xl">
        Foundation is live.
      </h1>
      <p className="max-w-xl text-ink-500">
        Database, authentication, RBAC, and the base UI system are wired up.
        The full storefront (homepage, categories, product listings, cart,
        checkout) lands in Phase 3.
      </p>
      <div className="flex gap-3">
        <Button variant="primary">Get started</Button>
        <Button variant="outline">Learn more</Button>
      </div>
    </main>
  );
}
