'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@lib/supabaseClient' // استخدام supabaseBrowser بدلاً من supabase

// دالة لتحويل النصوص إلى slug صالح
function slugify(input: string) {
  const s = (input || '').trim().toLowerCase()
  return s
    .replace(/\s+/g, '-')             // مسافات → -
    .replace(/[^\p{L}\p{N}-]+/gu, '') // أحرف/أرقام/شرطة فقط (يدعم العربية)
    .replace(/-+/g, '-')              // دمج الشرطات
    .replace(/^-|-$/g, '')            // قصّ الشرطات من الطرفين
}

export default function EditCategoryPage() {
  const router = useRouter()
  const { id } = useParams()
  const [form, setForm] = useState({ name: '', slug: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // تأكد من وجود id
    if (!id) {
      setError('لم يتم العثور على المعرف.')
      setLoading(false)
      return
    }

    const fetchCategory = async () => {
      const { data, error } = await supabaseBrowser
        .from('categories')
        .select('name, slug')
        .eq('id', Number(id))
        .single()

      if (error || !data) {
        setError('⚠️ لم يتم العثور على التصنيف')
      } else {
        setForm({ name: data.name, slug: data.slug })
      }
      setLoading(false)
    }

    fetchCategory()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // تحقق من وجود الاسم والـ slug
    const { name, slug } = form
    if (!name.trim()) {
      setError('الاسم مطلوب')
      return
    }
    
    const effectiveSlug = slugify(slug || name)
    if (!effectiveSlug) {
      setError('الـ slug غير صالح')
      return
    }

    // تحديث التصنيف
    setLoading(true)
    try {
      const { error } = await supabaseBrowser
        .from('categories')
        .update({
          name,
          slug: effectiveSlug,
        })
        .eq('id', Number(id))

      if (error) {
        setError('❌ فشل التحديث: ' + error.message)
      } else {
        alert('✅ تم تحديث التصنيف بنجاح!')
        router.push('/admin/products/categories')
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-center p-10">جاري التحميل...</p>
  if (error) return <p className="text-red-600 text-center p-10">{error}</p>

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-[#ec7302]">✏️ تعديل التصنيف #{id}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="اسم التصنيف"
          value={form.name}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          required
        />
        <input
          type="text"
          name="slug"
          placeholder="الرابط (slug)"
          value={form.slug}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          required
        />
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          className="bg-[#ec7302] text-white px-6 py-2 rounded hover:bg-[#ec6114]"
        >
          💾 حفظ التعديلات
        </button>
      </form>
    </div>
  )
}
