// src/components/AdvancedSwiper.tsx
'use client';

import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Image from 'next/image';
import Link from 'next/link';

type Product = {
  id: number | string;
  slug: string;
  title: string;           // اسم المنتج
  price?: number | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  image?: string | null;
};

type Props = { products: Product[] };

export default function AdvancedSwiper({ products }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Placeholder أثناء SSR لتفادي مشاكل hydration
  if (!mounted) {
    return <div className="w-full h-56 bg-gray-200 rounded-lg animate-pulse" />;
  }

  if (!products || products.length === 0) return null;

  const enableLoop = products.length > 4;

  return (
    <Swiper
      modules={[Navigation, Pagination, Autoplay]}
      spaceBetween={16}
      slidesPerView={2}
      breakpoints={{
        640: { slidesPerView: 2 },
        768: { slidesPerView: 3 },
        1024: { slidesPerView: 4 },
      }}
      navigation
      pagination={{ clickable: true }}
      autoplay={{ delay: 3000, disableOnInteraction: false }}
      loop={enableLoop}
    >
      {products.map((p) => {
        const imgSrc =
          (typeof p.thumbnail_url === 'string' && p.thumbnail_url) ||
          (typeof p.image_url === 'string' && p.image_url) ||
          (typeof p.image === 'string' && p.image) ||
          '/images/placeholders/phone-placeholder.jpg';

        return (
          <SwiperSlide key={String(p.id)}>
            <Link
              href={`/product/${p.slug}`}
              className="block border rounded-lg overflow-hidden hover:shadow-lg transition transform hover:scale-[1.02] bg-white"
            >
              <Image
                src={imgSrc}
                alt={p.title || 'منتج'}
                width={300}
                height={220}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="w-full h-44 object-cover"
                loading="lazy"
                unoptimized={imgSrc.startsWith('http')}
              />
              <div className="p-3">
                <h4 className="font-semibold line-clamp-1">{p.title || 'بدون اسم'}</h4>
                {typeof p.price === 'number' && !Number.isNaN(p.price) && (
                  <p className="text-sm mt-1 text-[#0f766e] font-medium">
                    {p.price.toFixed(2)} ر.س
                  </p>
                )}
              </div>
            </Link>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
