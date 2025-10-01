// src/app/payment/page.tsx
import Link from 'next/link'
import PageSeo from '@/components/PageSeo'

export const revalidate = 0

const BRAND_ORANGE = '#ee7103'

export default function PaymentPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'

  // JSON-LD (اختياري لكنه مفيد للسيو)
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'طرق الدفع',
    url: `${siteUrl}/payment`,
    about: { '@type': 'Organization', name: 'متجر الهواتف' },
    paymentAccepted: ['Cash', 'Credit Card', 'Bank Transfer', 'Apple Pay', 'STC Pay'],
    isAccessibleForFree: true,
  }

  return (
    <div className="min-h-screen bg-[#0d1117] pt-24 px-6 text-white font-[Cairo]">
      {/* SEO */}
      <PageSeo
        title="طرق الدفع"
        description="تعرف على خيارات الدفع المتاحة في متجر الهواتف: الدفع عند الاستلام، البطاقات البنكية، التحويل البنكي، ووسائل الدفع الرقمية."
        path="/payment"
      />

      {/* JSON-LD Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <div className="max-w-3xl mx-auto bg-white text-[#111827] p-6 rounded-2xl shadow ring-1 ring-black/5">
        <h1 className="text-3xl font-extrabold mb-4" style={{ color: BRAND_ORANGE }}>
          💳 طرق الدفع
        </h1>

        <p className="mb-3">
          نوفر لك خيارات دفع آمنة ومتنوعة لتسهيل عملية الشراء:
        </p>

        <ul className="list-disc ps-6 mb-4 space-y-1">
          <li>الدفع عند الاستلام (Cash on Delivery).</li>
          <li>الدفع ببطاقات مدى، فيزا، وماستركارد.</li>
          <li>تحويل بنكي مباشر.</li>
          <li>
            Apple Pay و STC Pay <span className="text-gray-500">(قريبًا)</span>.
          </li>
        </ul>

        <p className="text-sm text-gray-600">
          تتم جميع المدفوعات الإلكترونية عبر بوابات دفع آمنة ومشفرة. قد تنطبق رسوم/شروط إضافية بحسب طريقة الدفع المختارة.
        </p>

        {/* CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/checkout"
            className="inline-block text-white py-2 px-5 rounded hover:opacity-90 transition"
            style={{ background: BRAND_ORANGE }}
            aria-label="متابعة الدفع وإتمام الطلب"
          >
            متابعة الدفع
          </Link>
        </div>
      </div>
    </div>
  )
}
