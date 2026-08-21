import Link from 'next/link';
import { ShoppingCart, User } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { getCartItemCount } from '@/services/cart.service';
import { getCategoryTree } from '@/services/category.service';
import { SearchBar } from '@/components/layout/search-bar';

export async function Header() {
  const user = await getCurrentUser();
  const [cartCount, categories] = await Promise.all([
    user ? getCartItemCount(user.id) : Promise.resolve(0),
    getCategoryTree(),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex-shrink-0 text-lg font-bold text-brand-700">
          AJ Marketplace
        </Link>
        <div className="hidden flex-1 justify-center sm:flex">
          <SearchBar />
        </div>
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <Link href="/account/orders" className="flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand-600">
              <User className="h-5 w-5" />
              <span className="hidden sm:inline">{user.name ?? 'Account'}</span>
            </Link>
          ) : (
            <Link href="/login" className="flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand-600">
              <User className="h-5 w-5" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
          <Link href="/cart" className="relative flex items-center text-ink-700 hover:text-brand-600" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
      <div className="border-t border-ink-100 sm:hidden">
        <div className="px-4 py-2">
          <SearchBar />
        </div>
      </div>
      <nav className="hidden border-t border-ink-100 sm:block">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 py-2 text-sm sm:px-6 lg:px-8">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="whitespace-nowrap text-ink-600 hover:text-brand-600"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
