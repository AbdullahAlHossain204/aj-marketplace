'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

export function ImageGallery({
  images,
  productName,
}: {
  images: { url: string; altText: string | null }[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square w-full overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.url} alt={active.altText ?? productName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-ink-400">No image</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                'h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2',
                i === activeIndex ? 'border-brand-600' : 'border-transparent'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
