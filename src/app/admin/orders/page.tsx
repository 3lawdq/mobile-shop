'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '../../../../lib/supabaseClient'
import { toast } from 'react-hot-toast'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type OrderItem = {
  id: number
  title: string
  image: string
  quantity: number
}

type OrderRow = {
  id: string
  created_at: string
  total: number
  items: OrderItem[] | null
  status: string
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // (اختياري) فلترة بسيطة بالبحث
  const [q, setQ] = useState('')

  // تحقّق احتياطي من صلاحية الأدمن (الميدل وير يحمي المسار أصلًا)
  useEffect(() => {
    ;(async () => {
      setErr(null)
      const { data: { user } } = await supabaseBrowser.auth.getUser()

      if (!user) {
        router.replace('/admin/login')
        return
      }

      const { data: profile } = await supabaseBrowser
        .from('profiles')
        .select('role')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle()

      if ((profile?.role ?? 'user') !== 'admin') {
        router.replace('/')
        return
      }

      // جلب الطلبات
      const { data, error } = await supabaseBrowser
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setErr('حدث خطأ أثناء جلب الطلبات: ' + error.message)
        setOrders([]) 
      } else {
        setOrders((data ?? []) as OrderRow[])
      }

      setLoading(false)
    })()
  }, [router])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return orders
    return orders.filter((o) => {
      const idMatch = (o.id ?? '').toLowerCase().includes(term)
      const itemsTitles = (o.items ?? [])
        .map((it) => it.title?.toLowerCase?.() || '')
        .join(' ')
        .includes(term)
      return idMatch || itemsTitles
    })
  }, [orders, q])

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center font-[Cairo]">
        <p>جاري التحقق وجلب الطلبات...</p>
      </div>
    )
  }

  if (err) {
    toast.error(err)  // تحسين عرض الخطأ
    return (
      <div className="min-h-screen flex justify-center items-center font-[Cairo]">
        <p className="text-red-600 font-bold text-lg">{err}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] py-20 px-4 font-[Cairo]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
          <h1 className="text-3xl font-bold text-[#ec7302]">📦 إدارة الطلبات</h1>

          <input
            type="text"
            placeholder="🔍 ابحث برقم الطلب أو اسم المنتج داخل الطلب…"
            className="border-2 border-gray-300 px-4 py-2 w-full sm:w-80 rounded-lg bg-white"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-500">لا توجد طلبات مطابقة لبحثك.</p>
        ) : (
          <div className="grid gap-4">
            {filtered.map((order) => {
              const itemsCount = (order.items ?? []).reduce(
                (acc, it) => acc + (Number(it.quantity) || 0),
                0
              )

              return (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block bg-white shadow rounded p-5 hover:bg-gray-50 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        رقم الطلب: <span className="font-bold">{order.id}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString('ar-EG')}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <p className="text-gray-700">
                        📱 عدد الهواتف: <span className="font-semibold">{itemsCount}</span>
                      </p>
                      <p className="text-gray-700">
                        💰 المجموع:{' '}
                        <span className="font-semibold">
                          {Number(order.total).toFixed(2)} ر.س
                        </span>
                      </p>
                      <p className="text-sm text-yellow-700">🕒 الحالة: {order.status}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
