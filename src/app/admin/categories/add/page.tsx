'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import PageSeo from '@/components/PageSeo'

// (اختياري) نسخة تدعم العربية
function slugify(input: string) {
  const s = (input || '').trim().toLowerCase()
  return s
    .replace(/\s+/g, '-')             // مسافات → -
    .replace(/[^\p{L}\p{N}-]+/gu, '') // أحرف/أرقام/شرطة فقط (يدعم العربية)
    .replace(/-+/g, '-')              // دمج الشرطات
    .replace(/^-|-$/g, '')            // قصّ الشرطات من الطرفين
}

export default function AddProductCategoryPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const nameTrimmed = name.trim()
    if (!nameTrimmed) {
      setError('الاسم مطلوب')
      return
    }

    const effectiveSlug = (slug ? slugify(slug) : slugify(nameTrimmed))
    if (!effectiveSlug) {
      setError('الـ slug غير صالح')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/products/categories/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameTrimmed, slug: effectiveSlug }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.message || 'فشل في إضافة فئة المنتج'
        setError(msg)
        toast.error(msg)
        return
      }

      toast.success('تمت إضافة فئة المنتج بنجاح ✅')
      router.replace('/admin/products/categories')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('حدث خطأ غير متوقع')
      toast.error('حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <PageSeo title="إضافة فئة منتج — لوحة الإدارة" noindex />

      <h1 className="text-2xl font-bold mb-6">➕ إضافة فئة منتج جديدة</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="اسم فئة المنتج"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          required
        />

        <div>
          <input
            type="text"
            placeholder="الرابط (slug) — يُملأ تلقائيًا من الاسم إن تركته فارغًا"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
          <p className="text-xs text-gray-500 mt-1">
            يُسمح بأحرف إنجليزية صغيرة وأرقام وشرطات فقط (kebab-case)
          </p>
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-60"
        >
          {loading ? 'جاري الحفظ...' : '📂 حفظ فئة المنتج'}
        </button>
      </form>
    </div>
  )
}
