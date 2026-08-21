import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-ink-50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 text-sm sm:grid-cols-4 sm:px-6 lg:px-8">
        <div>
          <h3 className="mb-3 font-semibold text-ink-800">Shop</h3>
          <ul className="flex flex-col gap-2 text-ink-500">
            <li><Link href="/search" className="hover:text-brand-600">All products</Link></li>
            <li><Link href="/" className="hover:text-brand-600">Categories</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-ink-800">Account</h3>
          <ul className="flex flex-col gap-2 text-ink-500">
            <li><Link href="/account/orders" className="hover:text-brand-600">Your orders</Link></li>
            <li><Link href="/login" className="hover:text-brand-600">Sign in</Link></li>
            <li><Link href="/register" className="hover:text-brand-600">Create account</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-ink-800">Sell</h3>
          <ul className="flex flex-col gap-2 text-ink-500">
            <li><span className="text-ink-300">Become a seller (coming soon)</span></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-ink-800">AJ Marketplace</h3>
          <p className="text-ink-500">Shop thousands of products from trusted sellers.</p>
        </div>
      </div>
      <div className="border-t border-ink-100 px-4 py-4 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} AJ Marketplace. All rights reserved.
      </div>
    </footer>
  );
}
