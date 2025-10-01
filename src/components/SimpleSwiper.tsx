// src/components/SimpleSwiper.tsx
"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import Image from "next/image";

type Props = {
  slides: { id: number; image: string; name: string }[];
};

export default function SimpleSwiper({ slides }: Props) {
  return (
    <Swiper
      spaceBetween={16}
      slidesPerView={2}
      breakpoints={{ 768: { slidesPerView: 3 } }}
      loop={true}
    >
      {slides.map((slide) => {
        const imgSrc =
          slide.image?.startsWith("http") && slide.image
            ? slide.image
            : "/images/placeholders/phone-placeholder.jpg";

        return (
          <SwiperSlide key={slide.id}>
            <a
              href={`/product/${slide.id}`}
              className="block border rounded-lg overflow-hidden hover:shadow-lg transition transform hover:scale-[1.02] bg-white"
            >
              <Image
                src={imgSrc}
                alt={slide.name}
                width={320}
                height={176}
                className="w-full h-44 object-cover"
                priority
                unoptimized={imgSrc.startsWith("http")}
              />
              <div className="p-3 bg-white">
                <h4 className="font-semibold line-clamp-1">{slide.name}</h4>
              </div>
            </a>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
