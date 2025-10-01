// src/app/about/page.tsx

import Link from "next/link";

export const metadata = {
  title: 'من نحن - Mobile Shop',
  description: 'تعرف على Mobile Shop، متجر إلكتروني يقدم أحدث الهواتف والإكسسوارات مع خدمة توصيل سريعة.',
}

export default function AboutPage() {
  return (
    <div className="bg-white text-gray-900 min-h-screen pt-24 px-6 font-[Cairo]">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 p-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-extrabold mb-6 text-center text-primary">📱 من نحن</h1>

        <p className="text-lg mb-4 leading-relaxed">
          متجر <strong>Mobile Shop</strong> هو متجر إلكتروني متخصص في بيع الهواتف الذكية
          والإكسسوارات الأصلية. نهدف لتقديم منتجات عالية الجودة بأسعار تنافسية مع تجربة تسوق سهلة وسريعة.
        </p>

        <p className="text-md mb-4 leading-relaxed">
          📍 <strong>الموقع:</strong> تعز - اليمن <br />
          🕓 <strong>ساعات العمل:</strong> من 9 صباحًا حتى 9 مساءً
        </p>

        <p className="text-md mb-6">
          📱 <strong>تواصل معنا:</strong>
        </p>
        <ul className="list-disc list-inside mb-6 space-y-2 text-sm">
          <li>
            واتساب:{" "}
            <a
              href="https://wa.me/966500000000"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              966500000000+
            </a>
          </li>
          <li>
            إنستغرام:{" "}
            <a
              href="https://instagram.com/mobileshop"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 hover:underline"
            >
              @mobileshop
            </a>
          </li>
        </ul>

        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
          <h2 className="text-xl font-semibold mb-2">🤝 لماذا تختارنا؟</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>منتجات أصلية 100%</li>
            <li>توصيل سريع وآمن لجميع المناطق</li>
            <li>أسعار تنافسية وعروض خاصة</li>
            <li>خدمة عملاء متوفرة دائمًا لمساعدتك</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="bg-primary text-white px-6 py-2 rounded-lg hover:opacity-90 transition"
          >
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
