'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import PageSeo from '@/components/PageSeo'
import { supabaseBrowser } from '@lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

/** مولّد slug يدعم العربية */
function toSlug(input: string) {
  const s = (input || '').trim().toLowerCase()
  return s
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** حساب السعر بعد الخصم (للمعاينة فقط) */
function computeFinalPrice(price: number, discountPercent: number) {
  if (!price || discountPercent <= 0) return { final: price, hasDiscount: false }
  const final = Math.max(0, Math.round((price * (100 - discountPercent)) / 100))
  return { final, hasDiscount: true }
}

type DbProduct = {
  id: number | string
  name: string
  brand: string
  category_id?: number | string | null
  price: number
  cover_url?: string | null
  image?: string | null
  rating?: number | null
  description?: string | null
  slug?: string | null
  created_at?: string | null
  is_new?: boolean | null
  is_trending?: boolean | null
  discount_percent?: number | null
  stock?: number | null
  color?: string | null
}

type CategoryRow = { id: number | string; name: string; slug?: string | null }

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isAdmin, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [original, setOriginal] = useState<DbProduct | null>(null)

  const [form, setForm] = useState({
    name: '',
    brand: '',
    category_id: '', // يعتمد على معرّف التصنيف
    price: '',
    cover_url: '',
    rating: '',
    description: '',
    slug: '',
    is_new: false,
    is_trending: false,
    discount_percent: '',
    stock: '',
    color: '',
  })

  // جلب المنتج + التصنيفات
  useEffect(() => {
    if (authLoading) return // تأكد من أن المستخدم مصرح له
    if (!isAdmin) {
      alert('ليس لديك صلاحية الوصول إلى هذه الصفحة.')
      router.replace('/admin/login')
      return
    }

    ;(async () => {
      try {
        setLoading(true)
        setErrMsg(null)

        const idNum = Number(id)
        const matchVal = Number.isFinite(idNum) ? idNum : id

        const [productRes, catsRes] = await Promise.all([ // جلب المنتج والتصنيفات معًا
          supabaseBrowser.from('products').select('*').eq('id', matchVal).maybeSingle<DbProduct>(),
          supabaseBrowser.from('categories').select('id,name,slug').order('name', { ascending: true }),
        ])

        if (productRes.error) {
          setErrMsg('تعذر جلب بيانات المنتج.')
          setLoading(false)
          return
        }

        const p = productRes.data ?? null
        if (!p) {
          setErrMsg('المنتج غير موجود.')
          setLoading(false)
          return
        }

        setOriginal(p)

        const cover =
          (p.cover_url && /^https?:\/\//i.test(p.cover_url)) ? p.cover_url
          : (p.image && /^https?:\/\//i.test(p.image)) ? p.image
          : ''

        setForm({
          name: p.name || '',
          brand: p.brand || '',
          category_id: (p.category_id != null ? String(p.category_id) : ''),
          price: (Number.isFinite(p.price) ? p.price : 0).toString(),
          cover_url: cover,
          rating: (Number.isFinite(p.rating || 0) ? Number(p.rating) : 0).toString(),
          description: p.description || '',
          slug: p.slug || '',
          is_new: !!p.is_new,
          is_trending: !!p.is_trending,
          discount_percent: (Number.isFinite(p.discount_percent || 0) ? Number(p.discount_percent) : 0).toString(),
          stock: (Number.isFinite(p.stock || 0) ? Number(p.stock) : 0).toString(),
          color: p.color || '',
        })

        if (!catsRes.error && catsRes.data) setCategories(catsRes.data as CategoryRow[])
      } finally {
        setLoading(false)
      }
    })()
  }, [id, authLoading, isAdmin, router])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const regenerateSlug = () => {
    const next = toSlug(form.name)
    setForm(prev => ({ ...prev, slug: next }))
  }

  const imgSrc = useMemo(() => {
    const u = (form.cover_url || '').trim()
    return u && /^https?:\/\//i.test(u) ? u : '/vercel.svg'
  }, [form.cover_url])

  const previewPrice = useMemo(() => {
    const p = Number(form.price || 0)
    const d = Number(form.discount_percent || 0)
    return { ...computeFinalPrice(p, d), base: p, discount: d }
  }, [form.price, form.discount_percent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrMsg(null)
    setLoading(true)

    try {
      // تحقّقات أساسية
      if (!form.name.trim() || !form.brand.trim() || !String(form.category_id).trim()) {
        throw new Error('يرجى تعبئة الحقول الأساسية (الاسم، العلامة التجارية، التصنيف).')
      }

      const priceNum = Number(form.price)
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        throw new Error('السعر غير صالح.')
      }

      const ratingNum = form.rating ? Math.min(5, Math.max(0, Number(form.rating))) : null
      if (form.rating && (!Number.isFinite(Number(form.rating)) || Number(form.rating) < 0 || Number(form.rating) > 5)) {
        throw new Error('التقييم يجب أن يكون بين 0 و 5.')
      }

      if (!/^https?:\/\//i.test((form.cover_url || '').trim())) {
        throw new Error('رابط الغلاف يجب أن يبدأ بـ http/https.')
      }

      const catNum = Number(form.category_id)
      if (!Number.isFinite(catNum)) {
        throw new Error('category_id غير صالح.')
      }

      const finalSlug = (form.slug || toSlug(form.name)) || undefined
      const discountNum = Math.min(90, Math.max(0, Number(form.discount_percent || 0) || 0))
      const stockNum = Math.max(0, Number(form.stock || 0) || 0)

      // مرر توكن الجلسة في الهيدر لضمان تجاوز 401
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const accessToken = session?.access_token

      const res = await fetch('/api/products/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          id,
          name: form.name.trim(),
          brand: form.brand.trim(),
          price: priceNum,
          slug: finalSlug,
          cover_url: form.cover_url.trim(),
          rating: ratingNum,
          category_id: catNum,
          description: form.description?.trim() || null,
          is_new: !!form.is_new,
          is_trending: !!form.is_trending,
          discount_percent: discountNum,
          stock: stockNum,
          color: form.color?.trim() || null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'حدث خطأ أثناء التعديل.')
      }

      alert('✅ تم حفظ التعديلات بنجاح')
      router.replace('/admin/products')
      router.refresh()
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : 'حدث خطأ أثناء التعديل.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-center mt-20">جاري تحميل البيانات...</p>
  if (!original) return <p className="text-center mt-20">المنتج غير موجود</p>

  return (
    <div className="min-h-screen bg-[#26333f] text-white py-16 px-6 font-[Cairo]">
      <PageSeo title={`تعديل منتج #${original.id}`} noindex />

      <div className="max-w-3xl mx-auto bg-white text-[#26333f] p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-6 text-center text-[#b89c70]">
          تعديل المنتج #{original.id}
        </h1>
        <div className="rounded-lg border p-4 mb-6 bg-white">
          <div className="flex items-start gap-4">
            <Image
              src={imgSrc}
              alt="Preview"
              width={112}
              height={144}
              className="w-28 h-36 object-cover rounded border"
              priority
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {form.is_new && (
                  <span className="rounded bg-[#b89c70] text-white px-2 py-0.5 text-xs">جديد</span>
                )}
                {form.is_trending && (
                  <span className="rounded bg-amber-500 text-white px-2 py-0.5 text-xs">رائج</span>
                )}
                {Number(form.discount_percent || 0) > 0 && (
                  <span className="rounded bg-rose-600 text-white px-2 py-0.5 text-xs">
                    %{Math.round(Number(form.discount_percent))}
                  </span>
                )}
                {Number(form.stock || 0) <= 0 && (
                  <span className="rounded bg-gray-700 text-white px-2 py-0.5 text-xs">غير متوفر</span>
                )}
              </div>

              <h3 className="mt-2 font-bold">{form.name || 'اسم المنتج'}</h3>
              <p className="text-sm text-gray-600">{form.brand || 'اسم العلامة التجارية'}</p>

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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1">اسم المنتج *</label>
            <input
              type="text"
              name="name"
              placeholder="اسم المنتج"
              value={form.name}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
           <div>
            <label className="block text-sm font-semibold mb-1">اسم العلامة التجارية *</label>
            <input
              type="text"
              name="brand"
              placeholder="اسم العلامة التجارية"
              value={form.brand}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">التصنيف *</label>
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
            <label className="block text-sm font-semibold mb-1">رابط الغلاف (cover_url) *</label>
            <input
              type="url"
              name="cover_url"
              placeholder="https://example.com/image.jpg"
              value={form.cover_url}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
            <p className="text-xs text-gray-500 mt-1">يجب أن يبدأ بـ http/https</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">السعر *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                name="price"
                placeholder="السعر"
                value={form.price}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">التقييم (0..5)</label>
              <input
                type="number"
                min={0}
                max={5}
                step="0.1"
                name="rating"
                placeholder="التقييم (اختياري)"
                value={form.rating}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">الوصف</label>
            <textarea
              name="description"
              placeholder="الوصف (اختياري)"
              value={form.description}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              rows={4}
            />
          </div>

          <div>
            <label className="block text_sm font-semibold mb-1">Slug</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="slug"
                placeholder="slug-مثال"
                value={form.slug}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
              <button
                type="button"
                onClick={regenerateSlug}
                className="shrink-0 px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
                title="توليد slug من الاسم"
              >
                توليد
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">اتركه كما هو للحفاظ على الروابط الحالية.</p>
          </div>

          {/* حقول إضافية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_new" checked={form.is_new} onChange={handleChange} />
              <span className="text-sm font-semibold">جديد</span>
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_trending" checked={form.is_trending} onChange={handleChange} />
              <span className="text-sm font-semibold">رائج</span>
            </label>

            <div>
              <label className="block text-sm font-semibold mb-1">نسبة الخصم ٪</label>
              <input
                type="number"
                min={0}
                max={90}
                step="1"
                name="discount_percent"
                placeholder="مثال: 15"
                value={form.discount_percent}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">اتركها صفر/فارغ لعدم وجود خصم.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">المخزون</label>
              <input
                type="number"
                min={0}
                step="1"
                name="stock"
                placeholder="0 = غير متوفر"
                value={form.stock}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </div>

          {errMsg && <p className="text-red-600">{errMsg}</p>}

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#b89c70] text-white px-4 py-2 rounded hover:bg-[#a7895f] disabled:opacity-60"
            >
              {loading ? 'جاري الحفظ...' : '💾 حفظ التعديلات'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/admin/products')}
              className="px-4 py-2 rounded border hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
