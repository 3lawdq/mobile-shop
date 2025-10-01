// src/app/shipping/page.tsx
'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';

// ✅ PageSeo يعمل على المتصفح فقط لتفادي Invalid hook call
const PageSeo = dynamic(() => import('@/components/PageSeo'), { ssr: false });

export default function ShippingAndPaymentPage() {
  return (
    <div className="bg-white min-h-screen pt-24 px-6 text-gray-900 font-[Cairo]">
      {/* SEO */}
      <PageSeo
        title="الشحن والدفع"
        description="معلومات الشحن داخل اليمن وطرق الدفع المتاحة في Mobile Shop."
        path="/shipping"
      />

      <div className="max-w-3xl mx-auto bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
        {/* H1 واحد */}
        <h1 className="text-3xl font-extrabold mb-6 text-center text-primary">
          🚚 الشحن و 💳 طرق الدفع
        </h1>

        {/* الشحن */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">الشحن</h2>
          <p className="mb-3">
            نحرص على توصيل طلباتكم بسرعة وأمان إلى جميع المحافظات عبر شركاء موثوقين.
          </p>
          <ul className="list-disc ps-6 space-y-2">
            <li>مدة التوصيل: من 2 إلى 5 أيام عمل حسب المنطقة.</li>
            <li>شركات التوصيل: سمسا، أرامكس، وجهات محلية معتمدة.</li>
            <li>رسوم الشحن: تُحتسب حسب الموقع ووزن/حجم الطلب.</li>
          </ul>
          <p className="mt-3 text-sm text-gray-600">
            سيتم تزويدك برقم تتبّع عند شحن طلبك (إن توفر من شركة الشحن).
          </p>
        </section>

        <hr className="my-6 border-gray-200" />

        {/* الدفع */}
        <section>
          <h2 className="text-2xl font-semibold mb-3">طرق الدفع</h2>
          <p className="mb-3">
            نوفر لعملائنا خيارات دفع آمنة ومتنوعة لتسهيل عملية الشراء.
          </p>
          <ul className="list-disc ps-6 space-y-2">
            <li>الدفع عند الاستلام (Cash on Delivery).</li>
            <li>بطاقات مدى/فيزا/ماستركارد (إن توفرت عبر بوابة الدفع).</li>
            <li>تحويل بنكي مباشر.</li>
            <li>Apple Pay و STC Pay (قريبًا).</li>
          </ul>
          <p className="mt-4 text-sm text-gray-600">
            جميع المدفوعات الإلكترونية تتم عبر بوابات دفع آمنة ومشفّرة.
          </p>
        </section>

        {/* صورة توضيحية (تأكد من وجود الملف في /public/images/shipping.jpg) */}
        <section className="mt-8 text-center">
          <Image
            src="/images/shipping.jpg"
            alt="خيارات الشحن والدفع"
            width={500}
            height={300}
            className="mx-auto rounded-xl"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        </section>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/payment"
            className="inline-block bg-primary text-white py-2 px-4 rounded-lg hover:opacity-90 transition"
          >
            متابعة الدفع
          </Link>
        </div>
      </div>
    </div>
  );
}
