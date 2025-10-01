'use client';

import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Image from 'next/image';

type Item = {
  name: string;
  slug: string;
  thumbnail_url?: string;
  image_url?: string;
};

export default function TopSlider({ items }: { items: Item[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-lg w-full h-64 md:h-96 bg-gray-200 animate-pulse" />
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        loop
        autoplay={{ delay: 4000 }}
        spaceBetween={12}
        navigation
        pagination={{ clickable: true }}
        className="w-full h-64 md:h-96"
      >
        {items.map((it, idx) => {
          const isFirst = idx === 0;
          const src =
            (it.thumbnail_url && it.thumbnail_url.startsWith('http') && it.thumbnail_url) ||
            (it.image_url && it.image_url.startsWith('http') && it.image_url) ||
            '/images/banners/hero-1.jpg'; // fallback within the project

          return (
            <SwiperSlide key={it.slug}>
              <a href={`/product/${it.slug}`} className="block relative group" aria-label={it.name}>
                <Image
                  src={src}
                  alt={it.name || 'Product Image'}
                  width={1200}
                  height={600}
                  sizes="100vw"
                  className="w-full h-64 md:h-96 object-cover group-hover:scale-105 transition-transform duration-700"
                  priority={isFirst}
                  loading={isFirst ? undefined : 'lazy'}
                  unoptimized={false} // Removed unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                <div className="absolute bottom-0 p-4 md:p-6 text-white">
                  <h3 className="text-lg md:text-2xl font-bold drop-shadow-lg">
                    {it.name}
                  </h3>
                </div>
              </a>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
