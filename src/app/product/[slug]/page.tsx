"use client";

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabaseBrowser } from '@lib/supabaseClient';

// ✅ مكوّنات تعتمد على هوكس — تحميل على العميل فقط
const RatingStars = dynamic(() => import('@/components/RatingStars'), { ssr: false });
const AdvancedSwiper = dynamic(() => import('@/components/AdvancedSwiper'), { ssr: false });
const PageSeo = dynamic(() => import('@/components/PageSeo'), { ssr: false });

// السلة (نُبقي النوع كما هو ويُملأ من بيانات المنتج)
import { useCartStore, type CartProduct as StoreProduct } from '@/store/cart';
// المفضلة
import { useFavoritesStore, type FavoriteProduct } from '@/store/favorites';

type Brand = {
  id: number | string;
  name: string | null;
  slug?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  similar_color?: string | null;
};

type Product = {
  id: number;
  slug: string;
  title: string;
  brand_id?: number | string | null;
  brand_name?: string | null;  // في حال كانت موجودة مباشرة
  category?: string | null;
  category_id?: number | null;
  price?: number | null;
  rating?: number | null;
  description?: string | null;
  image?: string | null;
  thumbnail_url?: string | null;  // تم تعديل هذا السطر لاستخدام thumbnail_url
  primary_color?: string | null;  // لون الهوية الأساسي (للمنتج/الماركة)
  similar_color?: string | null;  // لون مقارب
  created_at?: string | null;
};

type Review = {
  id: string;
  product_id: number;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string;
};

export default function ProductDetailsPage() {
  const params = useParams();
  const slugParam = params?.slug;

  const [product, setProduct] = useState<Product | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // متاجر الحالة
  const addToCart = useCartStore((s) => s.addToCart);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const items = useCartStore((s) => s.items);

  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');

  const [showQtyControls, setShowQtyControls] = useState(false);

  const productId = product?.id;
  const currentQty =
    productId != null ? items.find((it) => String(it.id) === String(productId))?.quantity ?? 0 : 0;

  useEffect(() => {
    setShowQtyControls(currentQty > 0);
  }, [currentQty]);

  // اختيار صورة العرض
  const img = useMemo(() => {
    const thumb = (product?.thumbnail_url || '').trim();  // تغيير لـ thumbnail_url
    const main = (product?.image || '').trim();
    const pick = thumb.startsWith('http') ? thumb : main.startsWith('http') ? main : '';
    return pick || '/images/placeholders/phone-placeholder.jpg';
  }, [product?.thumbnail_url, product?.image]);

  // هل هو ضمن المفضلة؟
  const isFav = useMemo(
    () => (productId != null ? favorites.some((b) => String(b.id) === String(productId)) : false),
    [favorites, productId]
  );

  // تجهيز بيانات منتجات ذات صلة للسلايدر
  const relatedUI = useMemo(
    () =>
      related.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        price: typeof p.price === 'number' ? p.price : undefined,
        image: p.thumbnail_url && p.thumbnail_url.startsWith('http') ? p.thumbnail_url : p.image,
        thumbnail_url: p.thumbnail_url ?? undefined,
      })),
    [related]
  );

  useEffect(() => {
    async function fetchProduct() {
      if (!slugParam) return;
      setLoading(true);

      const decodedSlug = typeof slugParam === 'string' ? decodeURIComponent(slugParam) : '';

      // المنتج
      const { data, error } = await supabaseBrowser
        .from('products')
        .select('*')
        .eq('slug', decodedSlug)
        .maybeSingle<Product>();

      if (error || !data) {
        toast.error('حدث خطأ أثناء جلب المنتج.');
        setLoading(false);
        return;
      }

      setProduct(data);

      // الماركة (إن توفرت)
      if (data.brand_id) {
        const { data: bData } = await supabaseBrowser
          .from('brands')
          .select('id,name,slug,logo_url,primary_color,similar_color')
          .eq('id', data.brand_id)
          .maybeSingle<Brand>();
        if (bData) setBrand(bData);
      }

      // التقييمات
      const { data: reviewsData } = await supabaseBrowser
        .from('product_reviews')
        .select('*')
        .eq('product_id', data.id)
        .order('created_at', { ascending: false });

      if (reviewsData) {
        const safe = (reviewsData ?? []) as Review[];
        setReviews(safe);
        const totalRating = safe.reduce((acc, r) => acc + Number(r.rating || 0), 0);
        setAvgRating(safe.length ? totalRating / safe.length : null);
      }

      // منتجات ذات صلة (حسب التصنيف أو الماركة)
      let relatedQuery = supabaseBrowser.from('products').select('*').neq('id', data.id).limit(6);
      if (data.category_id) {
        relatedQuery = relatedQuery.eq('category_id', data.category_id);
      } else if (data.brand_id) {
        relatedQuery = relatedQuery.eq('brand_id', data.brand_id);
      } else if (data.category) {
        relatedQuery = relatedQuery.eq('category', data.category);
      }

      const { data: relatedProducts } = await relatedQuery;
      setRelated((relatedProducts as Product[]) ?? []);

      setLoading(false);
    }

    fetchProduct();
  }, [slugParam]);

  // تجهيز كائنات السلة/المفضلة من المنتج
  const cartProduct: StoreProduct = {
    id: product?.id ?? 0,
    name: product?.title ?? '',
    price: product?.price ?? 0,
    image: img,
    slug: product?.slug ?? '',
    rating: product?.rating ?? undefined,
    category: product?.category ?? undefined,
    thumbnail_url: product?.thumbnail_url ?? '',  // استخدام thumbnail_url هنا
    created_at: product?.created_at ?? '',
  };

  const favProduct: FavoriteProduct = {
    id: product?.id ?? 0,
    name: product?.title ?? '',
    price: product?.price ?? 0,
    image: img,
    slug: product?.slug ?? '',
    rating: product?.rating ?? undefined,
    thumbnail_url: product?.thumbnail_url ?? '',  // استخدام thumbnail_url هنا
  };

  // أحداث السلة/المفضلة
  const handleAddFirst = () => {
    if (!product) return;
    addToCart(cartProduct, 1);
    toast.success(currentQty === 0 ? '🛒 تمت إضافة المنتج إلى السلة. الكمية الآن: 1' : `🛒 تمت الزيادة. الكمية الآن: ${currentQty + 1}`);
  };

  const handleIncrement = () => {
    if (!product) return;
    increment(product.id);
    toast.success(`➕ تمت الزيادة. الكمية الآن: ${currentQty + 1}`);
  };

  const handleDecrement = () => {
    if (!product) return;
    if (currentQty <= 0) return;
    const next = Math.max(0, currentQty - 1);
    decrement(product.id);
    toast.success(next === 0 ? '🧺 تمت إزالة آخر قطعة من السلة.' : `➖ تم الإنقاص. الكمية الآن: ${next}`);
  };

  const handleToggleFavorite = () => {
    if (!product) return;
    toggleFavorite(favProduct);
    toast.success(isFav ? '❌ تمت إزالة المنتج من المفضلة' : '❤️ تمت إضافة المنتج إلى المفضلة');
  };

  // إرسال تقييم
  const handleSubmitReview = async () => {
    if (!product) return;
    const { data: { user }, error: authErr } = await supabaseBrowser.auth.getUser();

    if (authErr) {
      toast.error('تعذر التحقق من المستخدم.');
      return;
    }
    if (!user) {
      toast.error('❌ يجب تسجيل الدخول لإضافة تقييم.');
      return;
    }

    // منع التقييم المكرر لنفس المستخدم
    const { data: existingReview } = await supabaseBrowser
      .from('product_reviews')
      .select('*')
      .eq('product_id', product.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingReview) {
      toast.error('❌ لقد قمت بتقييم هذا المنتج مسبقًا.');
      return;
    }

    const { error } = await supabaseBrowser.from('product_reviews').insert({
      product_id: product.id,
      rating: newRating,
      comment: newComment,
      user_id: user.id,
    });

    if (error) {
      toast.error('حدث خطأ أثناء إرسال التقييم.');
      return;
    }

    toast.success('✅ تم إضافة تقييمك بنجاح!');
    setNewRating(5);
    setNewComment('');

    // تحديث القائمة والمتوسط
    const { data: updatedReviews } = await supabaseBrowser
      .from('product_reviews')
      .select('*')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false });

    if (updatedReviews) {
      const safe = updatedReviews as Review[];
      setReviews(safe);
      const total = safe.reduce((acc, r) => acc + Number(r.rating || 0), 0);
      setAvgRating(safe.length ? total / safe.length : null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-6 text-center font-[Cairo] bg-white text-slate-700">
        <p>جاري تحميل تفاصيل المنتج...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-24 px-6 text-center font-[Cairo] bg-white text-slate-700">
        <p>عذرًا، لم يتم العثور على المنتج.</p>
      </div>
    );
  }

  const brandPrimary = brand?.primary_color || product.primary_color || '';
  const brandSimilar = brand?.similar_color || product.similar_color || '';

  return (
    <>
     
      <PageSeo
        title={product.title}
        description={product.description || 'تفاصيل المنتج'}
        path={`/product/${product.slug}`}
        image={img}
      />

      {/* واجهة فاتحة بالكامل */}
      <div className="min-h-screen pt-24 px-6 font-[Cairo] bg-white text-slate-900">
        <div className="max-w-5xl mx-auto bg-white border border-gray-100 p-6 rounded-lg shadow-sm">
          {/* صورة + معلومات المنتج */}
          <div className="grid md:grid-cols-2 gap-6">
            <Image
  src={img}
  alt={product.title || 'منتج غير محدد'} // إضافة نص بديل للصورة
  width={500}
  height={700}
  className="w-full h-auto object-contain rounded bg-gray-50"
  priority
  sizes="(max-width: 768px) 100vw, 50vw"
/>


            <div>
              <h1 className="text-3xl font-extrabold mb-2">{product.title}</h1>

              {/* الماركة + ألوان الهوية */}
              {(brand?.name || brandPrimary || brandSimilar) && (
                <div className="flex items-center gap-3 mb-3">
                  {brand?.logo_url ? (
                    <Image
  src={img}
  alt={product.title || 'منتج غير محدد'} // إضافة نص بديل للصورة
  width={500}
  height={700}
  className="w-full h-auto object-contain rounded bg-gray-50"
  priority
  sizes="(max-width: 768px) 100vw, 50vw"
/>

                  ) : null}
                  {brand?.name ? <span className="text-sm text-slate-600">الماركة: {brand.name}</span> : null}
                  {(brandPrimary || brandSimilar) && (
                    <div className="flex items-center gap-2">
                      {brandPrimary && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          الأساسي
                          <span
                            aria-label={`اللون الأساسي ${brandPrimary}`}
                            className="inline-block w-4 h-4 rounded-full border"
                            style={{ backgroundColor: brandPrimary }}
                          />
                        </span>
                      )}
                      {brandSimilar && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          لون مقارب
                          <span
                            aria-label={`لون مقارب ${brandSimilar}`}
                            className="inline-block w-4 h-4 rounded-full border"
                            style={{ backgroundColor: brandSimilar }}
                          />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {avgRating !== null && (
                <div className="flex items-center gap-2 mb-2">
                  <RatingStars value={avgRating} />
                  <span className="text-sm text-slate-600">{avgRating.toFixed(1)} / 5</span>
                  <span className="text-xs text-slate-500">({reviews.length} تقييم)</span>
                </div>
              )}

              <p className="text-lg font-semibold mb-4">
                السعر: {typeof product.price === 'number' ? `${product.price} ر.س` : '—'}
              </p>

              {product.description && (
                <p className="text-sm text-slate-700 mb-6 leading-7">{product.description}</p>
              )}

              {/* السلة + المفضلة */}
              <div className="flex gap-4 flex-wrap items-center">
                {!showQtyControls ? (
                  <button
                    onClick={handleAddFirst}
                    className="bg-[#ec7302] text-white px-6 py-2 rounded-xl hover:opacity-90 transition"
                  >
                    أضف إلى السلة
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDecrement}
                      className="bg-gray-100 text-slate-900 px-3 py-2 rounded hover:bg-gray-200 transition"
                      aria-label="إنقاص الكمية"
                    >
                      –
                    </button>
                    <span className="min-w-[2.5rem] text-center font-bold">{currentQty}</span>
                    <button
                      onClick={handleIncrement}
                      className="bg-gray-100 text-slate-900 px-3 py-2 rounded hover:bg-gray-200 transition"
                      aria-label="زيادة الكمية"
                    >
                      +
                    </button>
                  </div>
                )}

                <button
                  onClick={handleToggleFavorite}
                  aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                  aria-pressed={isFav}
                  title={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                  className={`p-2 rounded-full border transition ${
                    isFav
                      ? 'text-red-600 border-red-600 bg-red-50 hover:bg-red-100'
                      : 'text-slate-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Heart size={22} fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* التقييمات */}
          <div className="mt-10">
            <h3 className="text-2xl font-bold mb-4">التقييمات</h3>

            <div className="mb-4 flex flex-col gap-2">
              <label className="font-semibold">قيّم المنتج:</label>
              <RatingStars value={newRating} onChange={(v) => setNewRating(v)} size={28} step={0.5} min={0} max={5} />
              <span className="text-xs text-slate-500">التقييم الحالي: {newRating.toFixed(1)} / 5</span>
            </div>

            <div className="mb-4 flex flex-col gap-2">
              <label className="font-semibold">تعليق:</label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="border p-3 rounded w-full text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b89c70]"
                rows={3}
                placeholder="اكتب رأيك هنا…"
              />
            </div>

            <button
              onClick={handleSubmitReview}
              className="bg-[#4caf50] text-white px-6 py-2 rounded-xl hover:opacity-90 transition mb-6"
            >
              إرسال التقييم
            </button>

            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="border p-3 rounded bg-white">
                  <RatingStars value={r.rating} />
                  <p className="text-sm text-slate-800">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* منتجات ذات صلة */}
          {relatedUI.length > 0 && (
            <div className="mt-10">
              <h3 className="text-2xl font-bold mb-4">منتجات ذات صلة</h3>
              <AdvancedSwiper products={relatedUI} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
