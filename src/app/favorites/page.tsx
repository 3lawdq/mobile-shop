'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';

import { useFavoritesStore } from '@/store/favorites';
import { useCartStore, type CartProduct } from '@/store/cart';

const fallbackImage = '/fallback-product.png';
const blurPlaceholder = '/fallback-blur.png';

export default function FavoritesPage() {
  // المفضلة
  const favorites = useFavoritesStore((s) => s.favorites);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  // السلة (Selectors منفصلة لتفادي إعادة الرندر الزائدة)
  const addToCart = useCartStore((s) => s.addToCart);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const items = useCartStore((s) => s.items);

  const router = useRouter();

  // تحويل FavoriteProduct -> CartProduct
  const toCartProduct = (p: {
    id: string | number;
    name: string;
    price: number;
    image: string;
    slug?: string;
    rating?: number;
    identity?: string | null;
    created_at?: string | null;
    category?: string;
    base_color?: string;
    near_color?: string;
  }): CartProduct => ({
    id: p.id,
    name: p.name ?? 'بدون اسم',
    price: typeof p.price === 'number' ? p.price : 0,
    image: p.image || fallbackImage,
    slug: p.slug ?? '',
    rating: p.rating ?? 0,
    category: p.category ?? '',
    identity: p.identity ?? '',
    base_color: p.base_color ?? '',
    near_color: p.near_color ?? '',
    created_at: p.created_at ?? '',
  });

  const getQty = (id: string | number) =>
    items.find((it) => String(it.id) === String(id))?.quantity ?? 0;

  if (favorites.length === 0) {
    return (
      <div className="bg-[#26333f] text-white min-h-screen pt-24 px-6 font-[Cairo] text-center">
        <h2 className="text-2xl mb-4">⭐ المفضلة فارغة</h2>
        <p>يمكنك العودة لتصفح الهواتف وإضافة بعض العناصر إلى المفضلة.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#26333f] text-white min-h-screen pt-24 px-6 font-[Cairo]">
      <h1 className="text-3xl font-bold mb-6 text-center">⭐ المفضلة</h1>

      <div className="max-w-4xl mx-auto space-y-4">
        {favorites.map((product) => {
          const href = `/product/${encodeURIComponent(product.slug ?? String(product.id))}`;
          const img = product.image || fallbackImage;
          const qty = getQty(product.id);

          return (
            <div
              key={product.id}
              className="bg-white text-[#26333f] p-4 rounded-lg flex flex-col sm:flex-row items-center gap-4 shadow cursor-pointer hover:shadow-md transition"
              onClick={() => router.push(href)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();  // لمنع السلوك الافتراضي
                  router.push(href);   // التنقل للصفحة المطلوبة
                }
              }}
              title="اذهب إلى صفحة المنتج"
            >
              <Image
                src={img}
                alt={product.name || 'صورة المنتج'}  // تأكد من توفير alt البديل
                width={100}
                height={100}
                className="rounded object-cover"
                placeholder="blur"
                blurDataURL={blurPlaceholder}
              />

              <div className="flex-1 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center w-full">
                <div className="pr-1">
                  <h3 className="font-bold line-clamp-2">{product.name}</h3>
                  <p className="text-sm font-semibold mt-1">
                    السعر: {product.price} ر.س
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  {/* زر/عداد السلة */}
                  {qty === 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(
                          toCartProduct({
                            ...product,
                            identity: product.identity,
                            created_at: product.created_at,
                          }),
                          1
                        );
                        toast.success('📱 تمت إضافة المنتج إلى السلة');
                      }}
                      className="px-3 py-1 rounded hover:opacity-90 text-white bg-[#b89c70]"
                      aria-label="أضف إلى السلة"
                    >
                      أضف إلى السلة
                    </button>
                  ) : (
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          const next = qty - 1;
                          decrement(product.id);
                          next === 0
                            ? toast.success('🧺 تمت إزالة آخر نسخة من السلة.')
                            : toast.success(`➖ تم الإنقاص. الكمية الآن: ${next}`);
                        }}
                        className="px-3 py-1 bg-gray-200 rounded hover:opacity-90"
                        aria-label="إنقاص الكمية"
                      >
                        –
                      </button>
                      <span className="min-w-[2.5rem] text-center font-bold">
                        {qty}
                      </span>
                      <button
                        onClick={() => {
                          increment(product.id);
                          toast.success(`➕ تمت الزيادة. الكمية الآن: ${qty + 1}`);
                        }}
                        className="px-3 py-1 bg-gray-200 rounded hover:opacity-90"
                        aria-label="زيادة الكمية"
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* إزالة من المفضلة */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(product.id);
                      toast.error('تم إزالة المنتج من المفضلة ❌');
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:opacity-90"
                    aria-label="إزالة من المفضلة"
                  >
                    إزالة
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
