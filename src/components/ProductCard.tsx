'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore, type CartProduct } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { Heart } from 'lucide-react';
import RatingStars from './RatingStars';  // تأكد من المسار الصحيح لمكون RatingStars

type LegacyProduct = {
  id: number | string;
  slug?: string | null;
  name?: string | null; // تم تغييره من title إلى name
  brand_name?: string | null; // تم تغييره من brand إلى brand_name
  price?: number | null;
  rating?: number | null;
  thumbnail_url?: string | null;  // تم استبدال cover_url بـ thumbnail_url
  image?: string | null;
  description?: string | null;
  categories?: string[];
  tags?: string[];
  is_new?: boolean | null;
  is_trending?: boolean | null;
  discount_percent?: number | null;
  stock?: number | null;
};

type Props = {
  product: CartProduct | LegacyProduct;
  priority?: boolean;
  readOnly?: boolean;
  onAdd?: (product: CartProduct) => void;
};

const BRAND_ORANGE = '#ec7302';
const BRAND_BLUE_DARK = '#26333f';

const isHttp = (u?: string | null) => !!u && /^https?:\/\//i.test(u);

function toCartProductCompat(
  product: CartProduct | LegacyProduct
): CartProduct & {
  categories: string[];
  tags: string[];
  description?: string;
  is_new?: boolean;
  is_trending?: boolean;
  discount_percent?: number;
  stock?: number;
} {
  const asCart = product as CartProduct & Partial<{
    categories: string[];
    tags: string[];
    description?: string;
    is_new?: boolean;
    is_trending?: boolean;
    discount_percent?: number;
    stock?: number;
  }>;


  // التحقق من خصائص المنتج قبل إرجاع الكائن
  const img =
    (asCart.thumbnail_url && isHttp(asCart.thumbnail_url)) ? asCart.thumbnail_url :
    (asCart.image && isHttp(asCart.image)) ? asCart.image :
    '/vercel.svg';  // تعيين صورة افتراضية إذا كانت الصورة غير موجودة

  return {
    id: asCart.id,
    slug: asCart.slug || undefined,
    name: asCart.name?.trim() || "بدون اسم",
    price: Number.isFinite(asCart.price ?? 0) ? (asCart.price as number) : 0,
    rating: asCart.rating != null ? Math.min(5, Math.max(0, Number(asCart.rating))) : undefined,
    image: img,
    description: asCart.description?.trim() || undefined,
    categories: Array.isArray(asCart.categories) ? asCart.categories : [],
    tags: Array.isArray(asCart.tags) ? asCart.tags : [],
    is_new: !!asCart.is_new,
    is_trending: !!asCart.is_trending,
    discount_percent: Number(asCart.discount_percent || 0),
    stock: Number.isFinite(asCart.stock) ? Number(asCart.stock) : 0,
  };
}


function computeFinalPrice(price: number, discountPercent?: number) {
  const d = Number(discountPercent || 0);
  if (!price || d <= 0) return { final: price, hasDiscount: false };
  const final = Math.max(0, Math.round((price * (100 - d)) / 100));
  return { final, hasDiscount: true };
}

const formatPrice = (p: number) =>
  Number.isFinite(p) && p > 0 ? `${p} ر.س` : 'مجاني';

function ProductCover({
  src,
  alt,
  priority,
  children,
}: {
  src?: string;
  alt: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  const fallback = '/vercel.svg';
  const [imgSrc, setImgSrc] = useState(src || fallback);

  useEffect(() => {
    setImgSrc(src || fallback);
  }, [src]);

  return (
    <div className="relative w-full h-96 md:h-80 lg:h-96 overflow-hidden rounded-t-2xl bg-gray-100 group-hover:shadow-lg transition-shadow">
      <Image
        src={imgSrc}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
        priority={priority}
        onError={() => imgSrc !== fallback && setImgSrc(fallback)}
        unoptimized={false} // إزالة unoptimized
      />
      {children}
    </div>
  );
}

function ProductCardBase({ product, priority = false, readOnly = false, onAdd }: Props) {
  const p = toCartProductCompat(product);
  const href = p.slug?.trim()
    ? `/product/${encodeURIComponent(p.slug)}`
    : `/product/${p.id}`;

  const quantityInCart = useCartStore(
    (s) => s.items.find((i) => String(i.id) === String(p.id))?.quantity ?? 0
  );

  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFav = useFavoritesStore((s) =>
    s.favorites.some((fb) => String(fb.id) === String(p.id))
  );

  const outOfStock = (p.stock ?? 0) <= 0;
  const { final, hasDiscount } = computeFinalPrice(p.price, p.discount_percent);

  return (
    <Link
      href={href}
      className="group block rounded-2xl border bg-white shadow-sm hover:shadow-lg transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <ProductCover src={p.image} alt={p.name} priority={priority}>
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {p.is_new && (
            <span className="rounded-md bg-[#ec7302] text-white px-2 py-1 text-xs font-semibold shadow">
              جديد
            </span>
          )}
          {p.is_trending && (
            <span className="rounded-md bg-amber-500 text-white px-2 py-1 text-xs font-semibold shadow">
              رائج
            </span>
          )}
        </div>

        {(p.discount_percent ?? 0) > 0 && (
          <div className="absolute top-3 right-3 z-10">
            <span className="rounded-md bg-rose-600 text-white px-2 py-1 text-xs font-bold">
              %{Math.round(Number(p.discount_percent))}
            </span>
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <span className="rounded-md bg-white/95 text-[#26333f] px-3 py-1 text-sm font-bold shadow">
              غير متوفر
            </span>
          </div>
        )}
      </ProductCover>

      <div className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <h3 className="line-clamp-2 text-base font-semibold text-[#ec7302]">
            {p.name}
          </h3>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite({
                id: p.id,
                name: p.name,
                brand_name: p.brand_name,
                price: p.price,
                image: p.image,
                slug: p.slug,
                rating: p.rating,
              });
            }}
            aria-label={isFav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            aria-pressed={isFav}
            title={isFav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            className={`p-1 rounded-full border transition hover:shadow-sm active:scale-95
              ${isFav
                ? "text-red-600 border-red-600 bg-red-50 hover:bg-red-100"
                : "text-red-400 border-red-300 hover:bg-red-100"
              }`}
          >
            <Heart
              size={20}
              stroke="currentColor"
              strokeWidth={2}
              fill={isFav ? "currentColor" : "none"}
              className="transition-transform"
            />
          </button>
        </div>

        {p.brand_name && (
          <p className="line-clamp-1 text-sm text-gray-800">{p.brand_name}</p>
        )}

        {typeof p.rating === "number" && (
          <div className="flex items-center gap-1 rtl">
            <RatingStars value={p.rating} readOnly size={18} starColor={BRAND_ORANGE} />
          </div>
        )}

        {p.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {p.categories.map((c) => (
              <span
                key={c}
                className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-900"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm md:text-base font-bold text-[#ec7302] flex items-center gap-2">
            {hasDiscount ? (
              <>
                <span className="text-gray-400 line-through">
                  {formatPrice(p.price)}
                </span>
                <span className="text-[#ec7302]">{formatPrice(final)}</span>
              </>
            ) : (
              <>{formatPrice(p.price)}</>
            )}
          </span>

          {!readOnly && (
            <div className="flex items-center gap-2">
              {quantityInCart > 0 ? (
                <>
                  <button
                    type="button"
                    disabled={outOfStock}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      useCartStore.getState().decrement(p.id);
                    }}
                    className={`rounded-full px-2 py-1 text-white transition
                      ${outOfStock ? "bg-gray-400 cursor-not-allowed" : "bg-[var(--orange,#ec7302)] hover:bg-[var(--orange-hover,#d86a00)]"}`}
                  >
                    -
                  </button>

                  <span
                    className="text-sm font-bold"
                    style={{ color: BRAND_BLUE_DARK }}
                  >
                    {quantityInCart}
                  </span>

                  <button
                    type="button"
                    disabled={outOfStock}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onAdd) onAdd(p);
                      else useCartStore.getState().addToCart(p, 1);
                    }}
                    className={`rounded-full px-2 py-1 text-white transition
                      ${outOfStock ? "bg-gray-400 cursor-not-allowed" : "bg-[var(--orange,#ec7302)] hover:bg-[var(--orange-hover,#d86a00)]"}`}
                  >
                    +
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onAdd) onAdd(p);
                    else useCartStore.getState().addToCart(p, 1);
                  }}
                  className={`rounded-xl px-4 py-1.5 text-sm font-medium text-white transition
                    ${outOfStock ? "bg-gray-400 cursor-not-allowed" : "bg-[var(--orange,#ec7302)] hover:bg-[var(--orange-hover,#d86a00)]"}`}
                >
                  {outOfStock ? "غير متوفر" : "أضف للسلة"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

const ProductCard = React.memo(ProductCardBase);
export default ProductCard;
