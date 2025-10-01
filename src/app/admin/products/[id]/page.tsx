'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import PageSeo from '@/components/PageSeo'
import { supabaseBrowser } from '@lib/supabaseClient'
import { FaStar, FaWhatsapp, FaFacebook, FaTwitter } from 'react-icons/fa'

type Product = {
  id: string | number
  name: string
  brand: string
  price: number
  slug?: string | null
  cover_url?: string | null
  rating?: number | null
  description?: string | null
  category_id?: string | null
  color?: string | null // خاصية اللون الخاصة بالمنتجات
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || ''

export default function AdminProductDetailsPage() {
  const params = useParams()
  const idParam = params?.id as string | undefined

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!idParam) return

      // محاولة مطابقة الرقم إذا كان ممكنًا، وإذا كان معرفًا (UUID)
      const idNum = Number(idParam)
      const matchValue = Number.isFinite(idNum) ? idNum : idParam

      const { data, error } = await supabaseBrowser
        .from('products')
        .select('*')
        .eq('id', matchValue)
        .maybeSingle<Product>()

      if (!error && data) setProduct(data)
      setLoading(false)
    }

    fetchProduct()
  }, [idParam])

  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <p className="text-gray-600">جاري التحميل…</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <p className="text-gray-600">المنتج غير موجود</p>
      </div>
    )
  }

  const fullStars = Math.floor(product.rating || 0)
  const halfStar = (product.rating || 0) % 1 >= 0.5
  const displayRating = product.rating ?? 0

  // التحقق من وجود slug
  const publicPath = product.slug ? `/product/${product.slug}` : `/product/${product.id}`
  const shareUrl = SITE_URL ? `${SITE_URL}${publicPath}` : publicPath
  const shareText = encodeURIComponent(`شاهد هذا المنتج: ${product.name}`)

  return (
    <div className="min-h-screen pt-24 px-6">
      <PageSeo title={`تفاصيل المنتج — ${product.name}`} noindex />

      <div className="max-w-4xl mx-auto bg-white text-[#26333f] rounded shadow p-6 flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3">
          <div className="relative w-full h-64 rounded overflow-hidden bg-gray-100">
            <Image
              src={product.cover_url || '/vercel.svg'}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority
            />
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-3xl font-bold mb-2 text-[#b89c70]">{product.name}</h2>
          <p className="text-md mb-2">العلامة التجارية: {product.brand}</p>

          {product.description && (
            <p className="text-sm leading-relaxed mb-4">{product.description}</p>
          )}

          <p className="text-lg font-semibold text-[#b89c70] mb-2">
            السعر: {Number(product.price).toFixed(2)} ر.س
          </p>

          <div className="flex items-center gap-1 mb-6">
            {[...Array(fullStars)].map((_, i) => (
              <FaStar key={`full-${i}`} className="text-yellow-400" />
            ))}
            {halfStar && <FaStar className="text-yellow-400 opacity-50" />}
            <span className="ms-2 text-sm">({displayRating || 'لا يوجد'})</span>
          </div>

          {/* مشاركات سريعة (تشير للصفحة العامة للمنتج) */}
          <div className="flex gap-4 text-xl">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`أود شراء ${product.name} - ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:scale-110 transition"
              aria-label="شارك عبر واتساب"
            >
              <FaWhatsapp />
            </a>
            <a
              href={`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:scale-110 transition"
              aria-label="شارك عبر فيسبوك"
            >
              <FaFacebook />
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-500 hover:scale-110 transition"
              aria-label="شارك عبر X"
            >
              <FaTwitter />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
