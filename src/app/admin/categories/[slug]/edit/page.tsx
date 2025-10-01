'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@lib/supabaseClient'

type CategoryRow = { id: number | string; name: string; slug: string }

function toSlug(input: string) {
  return (input || '')
    .normalize('NFD')             // يفصل الحروف عن التشكيل
    .replace(/\p{M}+/gu, '')      // يزيل التشكيل
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')         // مسافات -> -
    .replace(/[^\p{L}\p{N}-]+/gu, '') // إبقاء أحرف/أرقام/شرطة فقط
    .replace(/-+/g, '-')          // دمج الشرطات
    .replace(/^-|-$/g, '')        // إزالة الشرطة من الطرفين
}

function safeDecode(v: string) {
  try { return decodeURIComponent(v) } catch { return v }
}

export default function EditCategoryPage() {
  const params = useParams()
  const raw = params?.slug
  const slugParam = Array.isArray(raw) ? raw[0] : raw
  const routeSlug = safeDecode(String(slugParam ?? ''))

  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [cat, setCat] = useState<CategoryRow | null>(null)

  const [form, setForm] = useState<{ name: string; slug: string }>({ name: '', slug: '' })

  useEffect(() => {
    ;(async () => {
      if (!routeSlug) return
      setLoading(true)
      setErr(null)

      const { data, error } = await supabaseBrowser
        .from('categories')
        .select('id,name,slug')
        .eq('slug', routeSlug)
        .maybeSingle()

      if (error || !data) {
        setErr('⚠️ لم يتم العثور على التصنيف')
        setCat(null)
      } else {
        const row = data as CategoryRow
        setCat(row)
        setForm({ name: row.name ?? '', slug: row.slug ?? '' })
      }

      setLoading(false)
    })()
  }, [routeSlug])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleGenerateSlug = () => {
    setForm((prev) => ({ ...prev, slug: toSlug(prev.name) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cat || saving) return
    setErr(null)
    setSaving(true)

    try {
      const nextName = form.name.trim()
      const nextSlug = toSlug(form.slug || form.name)

      if (!nextName || !nextSlug) {
        setErr('يرجى إدخال الاسم والـ slug بشكل صحيح.')
        return
      }

      // الحصول على التوكن باستخدام supabase.auth.getSession()
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setErr('توكن الوصول مفقود!')
        return
      }

      const res = await fetch('/api/categories/edit', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`, // استخدام التوكن
        },
        body: JSON.stringify({ id: cat.id, name: nextName, slug: nextSlug }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(json?.message || '❌ فشل التحديث.')
        return
      }

      // حدّث الحالة محليًا
      setCat((prev) => (prev ? { ...prev, name: nextName, slug: nextSlug } : prev))
      setForm({ name: nextName, slug: nextSlug })

      // لو تغيّر الـ slug، بدّل مسار الصفحة إلى الجديد لتجنّب 404 لاحقًا
      if (routeSlug !== nextSlug) {
        router.replace(`/admin/products/categories/${encodeURIComponent(nextSlug)}/edit`)
      }
      router.refresh()

      alert('✅ تم تحديث التصنيف بنجاح!')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-center p-10 font-[Cairo]">جاري تحميل البيانات...</p>
  }

  if (err) {
    return (
      <div className="p-6 max-w-xl mx-auto font-[Cairo]">
        <div className="bg-white rounded shadow p-6 text-center">
          <p className="text-red-600 mb-4">{err}</p>
          <Link href="/admin/products/categories" className="text-blue-600 hover:underline">
            ← عودة إلى التصنيفات
          </Link>
        </div>
      </div>
    )
  }

  if (!cat) return null

  return (
    <div className="p-6 max-w-xl mx-auto font-[Cairo]">
      <h1 className="text-2xl font-bold mb-6 text-[#ec7302]">✏️ تعديل تصنيف الهواتف: {cat.name}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded shadow p-6">
        <div>
          <label className="block text-sm font-semibold mb-1">اسم التصنيف *</label>
          <input
            type="text"
            name="name"
            placeholder="اسم التصنيف"
            value={form.name}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">الرابط (slug) *</label>
          <div className="flex gap-2">
            <input
              type="text"
              name="slug"
              placeholder="مثال: هواتف-أندرويد"
              value={form.slug}
              onChange={handleChange}
              className="w-full border px-4 py-2 rounded"
              required
            />
            <button
              type="button"
              onClick={handleGenerateSlug}
              className="shrink-0 px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
              title="توليد slug من الاسم"
            >
              توليد
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">يُفضّل استخدام أحرف/أرقام وشرطات فقط.</p>
        </div>

        {err && <p className="text-red-600">{err}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#ec7302] text-white px-6 py-2 rounded hover:bg-[#d46302] disabled:opacity-60"
          >
            {saving ? 'جارٍ الحفظ...' : '💾 حفظ التعديلات'}
          </button>
          <Link href="/admin/products/categories" className="px-4 py-2 rounded border hover:bg-gray-50">
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
