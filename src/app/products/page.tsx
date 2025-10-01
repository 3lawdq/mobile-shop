'use client';

import { useEffect, useMemo, useState } from 'react';
import nextDynamic from 'next/dynamic';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';
import ProductCard from '@/components/ProductCard';

const PageSeo = nextDynamic(() => import('@/components/PageSeo'), { ssr: false });
export const dynamic = 'force-dynamic';

type Product = {
  id: number | string;
  name?: string | null;
  description?: string | null;
  price?: number | null;
  image?: string | null; // تأكد من استخدام `image` بدلاً من `image_url`
  category_id?: number | null;
  rating?: number | null;
  created_at?: string | null;
};

const FALLBACK_IMG = '/vercel.svg';
const isHttp = (u?: string | null) => !!u && /^https?:\/\//i.test(u);
const safeImg = (u?: string | null) => (isHttp(u || '') ? (u as string) : FALLBACK_IMG);

export default function ProductsPage() {
  const [all, setAll] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // تحكمات الواجهة
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'default' | 'price_asc' | 'price_desc' | 'newest'>('default');
  const [minRating, setMinRating] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // اجلب الأعمدة التي تحتاجها فقط
        const { data, error } = await supabase
          .from('products')
          .select('id,name,description,price,image,category_id,rating,created_at') // تعديل `image_url` إلى `image`
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!alive) return;

        setAll((data || []) as Product[]);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : 'حدث خطأ أثناء جلب المنتجات');
        setAll([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let rows = [...all];

    // بحث بالاسم/الوصف
    const term = q.trim().toLowerCase();
    if (term) {
      rows = rows.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(term) || desc.includes(term);
      });
    }

    // فلترة تقييم
    if (minRating > 0) {
      rows = rows.filter((p) => (p.rating ?? 0) >= minRating);
    }

    // فرز
    if (sort === 'price_asc') {
      rows.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sort === 'price_desc') {
      rows.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (sort === 'newest') {
      rows.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }

    return rows;
  }, [all, q, sort, minRating]);

  return (
    <div className="bg-[#26333f] text-white min-h-screen pt-24 px-6 font-[Cairo]">
      {PageSeo && (
        <PageSeo
          title="جميع المنتجات"
          description="تسوّق أحدث الهواتف والإكسسوارات بأفضل الأسعار والعروض."
          path="/products"
          image={filtered.length ? safeImg(filtered[0].image) : undefined} // تعديل `image_url` إلى `image`
        />
      )}

      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-center text-[#ee7103] mb-6">
          🛍️ جميع المنتجات
        </h1>

        {/* أدوات التصفية والبحث */}
        <div className="bg-white text-[#26333f] rounded-xl shadow p-4 mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between sticky top-24 z-10">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن منتج…"
            className="w-full md:w-1/2 border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#ee7103]"
          />

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="border rounded px-3 py-2"
            >
              <option value={0}>كل التقييمات</option>
              <option value={5}>5 نجوم</option>
              <option value={4}>4+ نجوم</option>
              <option value={3}>3+ نجوم</option>
              <option value={2}>2+ نجوم</option>
              <option value={1}>1+ نجمة</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="border rounded px-3 py-2"
            >
              <option value="default">ترتيب افتراضي</option>
              <option value="newest">الأحدث</option>
              <option value="price_asc">السعر: الأقل ← الأعلى</option>
              <option value="price_desc">السعر: الأعلى ← الأقل</option>
            </select>
          </div>
        </div>

        {/* حالات التحميل/الخطأ */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm overflow-hidden">
                <div className="h-56 bg-gray-100 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-9 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : err ? (
          <p className="text-center text-red-300">{err}</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-200">لا توجد منتجات مطابقة.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((p) => (
              <ProductCard
                key={String(p.id)}
                product={{
                  id: Number(p.id),
                  name: (p.name || 'منتج').toString(),
                  description: (p.description || '').toString(),
                  price: Number(p.price || 0),
                  image: safeImg(p.image), // تعديل من `image_url` إلى `image`
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
