import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ImageGallery } from '@/components/product/image-gallery';
import { VariantSelector, type VariantData } from '@/components/product/variant-selector';
import { ReviewsList } from '@/components/product/reviews-list';
import { ProductGrid } from '@/components/product/product-grid';
import { Star } from 'lucide-react';
import { getProductBySlug, getRelatedProducts } from '@/services/product.service';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Product not found' };
  return {
    title: product.name,
    description: product.shortDescription ?? product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.categoryId, product.id);

  const variants: VariantData[] = product.variants.map((v) => ({
    id: v.id,
    price: v.price,
    attributes: (v.attributes as Record<string, string>) ?? {},
    inventory: v.inventory ? { quantity: v.inventory.quantity, reserved: v.inventory.reserved } : null,
  }));

  return (
    <div className="flex flex-col gap-10">
      <nav className="text-sm text-ink-400">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        {' / '}
        <Link href={`/categories/${product.category.slug}`} className="hover:text-brand-600">
          {product.category.name}
        </Link>
        {' / '}
        <span className="text-ink-600">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ImageGallery images={product.images} productName={product.name} />

        <div className="flex flex-col gap-4">
          <div>
            <Link href={`/categories/${product.category.slug}`} className="text-sm text-ink-400 hover:text-brand-600">
              {product.brand?.name ?? product.store.name}
            </Link>
            <h1 className="text-2xl font-semibold text-ink-900">{product.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-ink-500">
              {Number(product.reviewCount) > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  {Number(product.ratingAvg).toFixed(1)} ({product.reviewCount} reviews)
                </span>
              )}
              <Link href={`/stores/${product.store.slug}`} className="hover:text-brand-600">
                Sold by {product.store.name}
              </Link>
            </div>
          </div>

          {product.shortDescription && <p className="text-ink-600">{product.shortDescription}</p>}

          <VariantSelector variants={variants} productSlug={product.slug} />
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink-900">Description</h2>
        <p className="whitespace-pre-line text-sm text-ink-600">{product.description}</p>
      </section>

      {product.attributes.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900">Specifications</h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            {product.attributes.map((attr) => (
              <div key={attr.id} className="flex justify-between border-b border-ink-100 py-2 text-sm">
                <dt className="text-ink-500">{attr.name}</dt>
                <dd className="font-medium text-ink-800">{attr.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink-900">Reviews</h2>
        <ReviewsList
          reviews={product.reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            verifiedPurchase: r.verifiedPurchase,
            createdAt: r.createdAt,
            user: { name: r.user.name },
          }))}
        />
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-900">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
