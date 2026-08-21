import { notFound } from 'next/navigation';
import { ProductGrid } from '@/components/product/product-grid';
import { prisma } from '@/lib/db/prisma';
import { listProducts } from '@/services/product.service';
import { productListQuerySchema } from '@/lib/validation/product.schema';

export default async function StorePage({ params }: { params: { slug: string } }) {
  const store = await prisma.store.findUnique({
    where: { slug: params.slug, deletedAt: null },
    select: { id: true, name: true, logoUrl: true, description: true, ratingAvg: true },
  });
  if (!store) notFound();

  const result = await listProducts(productListQuerySchema.parse({ limit: 24 }), { storeSlug: params.slug });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 rounded-lg border border-ink-100 p-5">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logoUrl} alt={store.name} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-xl font-semibold text-brand-600">
            {store.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold text-ink-900">{store.name}</h1>
          {store.description && <p className="text-sm text-ink-500">{store.description}</p>}
          <p className="text-sm text-ink-400">Rating: {Number(store.ratingAvg).toFixed(1)}</p>
        </div>
      </div>
      <ProductGrid products={result.products} />
    </div>
  );
}
