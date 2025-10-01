'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import PageSeo from '@/components/PageSeo';
import ClientOnly from '@/components/ClientOnly';
import { supabaseBrowser } from '@lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image'; // استيراد Image من next/image

type Category = { id: string | number; name: string; slug?: string | null };

// مولّد slug يدعم العربية
function toSlug(input: string) {
  const s = (input || '').trim().toLowerCase();
  return s
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// حساب سعر بعد الخصم للمعاينة
function computeFinalPrice(price: number, discountPercent: number) {
  if (!price || discountPercent <= 0) return { final: price, hasDiscount: false };
  const final = Math.max(0, Math.round((price * (100 - discountPercent)) / 100));
  return { final, hasDiscount: true };
}

export default function AddProductPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    title: '',
    brand: '',
    category_id: '',
    price: '',
    image_url: '',
    rating: '',
    description: '',
    is_new: false,
    is_trending: false,
    discount_percent: '',
    stock: '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // تأكد من أن المستخدم مصرح له
    if (!isAdmin) {
      alert('ليس لديك صلاحية الوصول إلى هذه الصفحة.');
      router.replace('/admin/login');
      return;
    }

    // جلب التصنيفات فقط إذا كان المستخدم مسؤولًا
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseBrowser
        .from('categories')
        .select('id,name,slug')
        .order('name', { ascending: true });

      if (error) {
        console.error(error);
        toast.error('تعذر تحميل التصنيفات');
        return;
      }
      setCategories((data ?? []) as Category[]);
      setLoading(false);
    })();
  }, [authLoading, isAdmin, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    // التحقق من النوع وتحديد ما إذا كان checkbox
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const previewPrice = useMemo(() => {
    const p = Number(form.price || 0);
    const d = Number(form.discount_percent || 0);
    const { final, hasDiscount } = computeFinalPrice(p, d);
    return { base: p, final, hasDiscount, discount: d };
  }, [form.price, form.discount_percent]);

  const imgSrc = useMemo(() => {
    const u = (form.image_url || '').trim();
    return u && /^https?:\/\//i.test(u) ? u : '/vercel.svg';
  }, [form.image_url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);

    const { title, brand, category_id, price, image_url, rating, description } = form;
    if (!title.trim() || !brand.trim() || !category_id || !price.trim() || !image_url.trim()) {
      setErrMsg('يرجى ملء جميع الحقول الإلزامية!');
      return;
    }

    const priceNum = Number(price);
    const ratingNum = rating ? Math.min(5, Math.max(0, Number(rating))) : null;

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setErrMsg('السعر غير صالح.');
      return;
    }
    if (rating && (!Number.isFinite(Number(rating)) || Number(rating) < 0 || Number(rating) > 5)) {
      setErrMsg('التقييم يجب أن يكون بين 0 و 5.');
      return;
    }
    if (!/^https?:\/\//i.test(image_url.trim())) {
      setErrMsg('رابط الصورة يجب أن يبدأ بـ http/https.');
      return;
    }

    const slug = toSlug(title);
    const extra = {
      is_new: !!form.is_new,
      is_trending: !!form.is_trending,
      discount_percent: form.discount_percent ? Math.max(0, Number(form.discount_percent)) : 0,
      stock: form.stock ? Math.max(0, Math.floor(Number(form.stock))) : 0,
    };

    setLoading(true);
    try {
      // تحقّق الجلسة
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch('/api/products/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          brand: brand.trim(),
          price: priceNum,
          slug,
          image_url: image_url.trim(),
          rating: ratingNum,
          category_id: category_id || null,
          description: description?.trim() || null,
          ...extra,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || 'فشل في إضافة المنتج';
        setErrMsg(msg);
        toast.error(msg);
        return;
      }

      toast.success('تمت إضافة المنتج بنجاح ✅');
      router.replace('/admin/products');
      router.refresh();
    } catch (err) {
      console.error(err);
      setErrMsg('حدث خطأ غير متوقع');
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-[Cairo]">
        <p className="text-gray-500 text-lg">جاري تحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-10 px-6">
      <ClientOnly>
        <PageSeo title="إضافة منتج — لوحة الإدارة" noindex />
      </ClientOnly>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-[#26333f] text-center">إضافة منتج جديد</h1>

        <div className="rounded-lg border p-4 mb-6 bg-white text-[#26333f]">
          <div className="flex items-start gap-4">
            <Image
              src={imgSrc}
              alt="Preview"
              width={100}  // عرض الصورة
              height={150} // ارتفاع الصورة
              className="w-28 h-36 object-cover rounded border"
              placeholder="blur"
              blurDataURL="/fallback-blur.png"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {form.is_new && <span className="rounded bg-[#b89c70] text-white px-2 py-0.5 text-xs">جديد</span>}
                {form.is_trending && <span className="rounded bg-amber-500 text-white px-2 py-0.5 text-xs">رائج</span>}
                {Number(form.discount_percent || 0) > 0 && (
                  <span className="rounded bg-rose-600 text-white px-2 py-0.5 text-xs">
                    %{Math.round(Number(form.discount_percent))}
                  </span>
                )}
                {Number(form.stock || 0) <= 0 && (
                  <span className="rounded bg-gray-700 text-white px-2 py-0.5 text-xs">غير متوفر</span>
                )}
              </div>

              <h3 className="mt-2 font-bold">{form.title || 'عنوان المنتج'}</h3>
              <p className="text-sm text-gray-600">{form.brand || 'اسم الماركة'}</p>

              <div className="mt-2 flex items-center gap-3">
                {previewPrice.hasDiscount ? (
                  <>
                    <span className="line-through text-gray-400">{previewPrice.base} ر.س</span>
                    <span className="text-[#b89c70] font-bold">{previewPrice.final} ر.س</span>
                  </>
                ) : (
                  <span className="text-[#b89c70] font-bold">{previewPrice.base || 0} ر.س</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-lg shadow-lg">
         <div>
            <label className="block text-sm font-semibold mb-1 text-[#b89c70]">اسم المنتج *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#b89c70]">اسم الماركة *</label>
            <input
              type="text"
              name="brand"
              value={form.brand}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-[#b89c70]">التصنيف *</label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            >
              <option value="">اختر تصنيفًا</option>
              {categories.map((cat) => (
                <option key={String(cat.id)} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-[#b89c70]">رابط الصورة (image_url) *</label>
            <input
              type="url"
              name="image_url"
              value={form.image_url}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
            <p className="text-xs text-gray-500 mt-1">يجب أن يبدأ بـ http/https</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-[#b89c70]">السعر *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                name="price"
                value={form.price}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-[#b89c70]">التقييم (0..5)</label>
              <input
                type="number"
                min={0}
                max={5}
                step="0.1"
                name="rating"
                value={form.rating}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-[#b89c70]">الوصف</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-[#b89c70]">
              <input type="checkbox" name="is_new" checked={form.is_new} onChange={handleChange} />
              <span className="text-sm font-semibold">جديد</span>
            </label>
            <label className="flex items-center gap-2 text-[#b89c70]">
              <input type="checkbox" name="is_trending" checked={form.is_trending} onChange={handleChange} />
              <span className="text-sm font-semibold">رائج</span>
            </label>

            <div>
              <label className="block text-sm font-semibold mb-1 text-[#b89c70]">نسبة الخصم ٪</label>
              <input
                type="number"
                min={0}
                max={90}
                step="1"
                name="discount_percent"
                value={form.discount_percent}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">اتركها فارغة أو صفر إذا لا يوجد خصم.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-[#b89c70]">المخزون</label>
              <input
                type="number"
                min={0}
                step="1"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </div>

          {errMsg && <p className="text-red-600">{errMsg}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#b89c70] text-white px-4 py-2 rounded hover:bg-[#a7895f] disabled:opacity-60"
            >
              {loading ? 'جاري الحفظ...' : '📦 حفظ المنتج'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
