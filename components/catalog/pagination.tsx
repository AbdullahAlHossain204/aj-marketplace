import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <nav className="flex items-center justify-center gap-1 pt-6" aria-label="Pagination">
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-ink-400">…</span>}
          <Link
            href={buildHref(p)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium',
              p === page ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-ink-100'
            )}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </Link>
        </span>
      ))}
    </nav>
  );
}
