import Link from 'next/link';

export function CategoryCard({
  category,
}: {
  category: { name: string; slug: string; imageUrl: string | null };
}) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex flex-col items-center gap-2 rounded-lg border border-ink-100 bg-white p-4 text-center transition-shadow hover:shadow-md"
    >
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-50">
        {category.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-semibold text-brand-600">{category.name.charAt(0)}</span>
        )}
      </div>
      <span className="text-sm font-medium text-ink-800 group-hover:text-brand-600">{category.name}</span>
    </Link>
  );
}
