import Link from "next/link";
import { Pagination as PaginationMeta } from "../lib/types";

export function Pagination({
  pagination,
  searchParams,
}: {
  pagination: PaginationMeta;
  searchParams: Record<string, string | undefined>;
}) {
  if (pagination.totalPages <= 1) return null;

  function hrefForPage(page: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    params.set("page", String(page));
    return `/products?${params.toString()}`;
  }

  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  return (
    <nav className="flex items-center justify-center gap-2 py-6">
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefForPage(p)}
          className={`rounded-md px-3 py-1.5 text-sm ${
            p === pagination.page
              ? "bg-brand-600 text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {p}
        </Link>
      ))}
    </nav>
  );
}
