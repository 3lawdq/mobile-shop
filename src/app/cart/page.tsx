'use client';

import { useCartStore } from '@/store/cart';
import Image from 'next/image';
import Head from 'next/head';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

const FALLBACK_IMAGE = '/fallback-product.png';

export type CartItem = {
  id: string | number;
  title?: string;
  brand?: string;
  image?: string;
  price?: number;
  quantity?: number;
};

type CartStore = {
  items: CartItem[];
  removeFromCart: (id: string | number) => void;
  increment: (id: string | number) => void;
  decrement: (id: string | number) => void;
  clearCart: () => void;
  totalPrice: (() => number) | number;
  totalCount: (() => number) | number;
};

function asSafeText(v: unknown, fallback = ''): string {
  return typeof v === 'string' || typeof v === 'number' ? String(v) : fallback;
}

function asSafeNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asSafeImgSrc(v: unknown): string {
  if (typeof v === 'string' && (v.startsWith('/') || v.startsWith('http'))) {
    return v;
  }
  return FALLBACK_IMAGE;
}

export default function CartPage() {
  const {
    items,
    removeFromCart,
    increment,
    decrement,
    clearCart,
    totalPrice,
    totalCount,
  } = useCartStore() as CartStore;

  const totalCountVal = typeof totalCount === 'function' ? totalCount() : Number(totalCount ?? 0);
  const totalPriceVal = typeof totalPrice === 'function' ? totalPrice() : Number(totalPrice ?? 0);

  // إضافة logging لمتابعة العناصر في السلة
  console.log('Cart Items:', items);

  const handleIncrement = (id: string | number) => {
    increment(id);
    toast.success('تم زيادة الكمية ✅');
  };

  const handleDecrement = (id: string | number) => {
    decrement(id);
    toast('تم تقليل الكمية ⚡', { icon: '➖' });
  };

  const handleRemove = (id: string | number) => {
    removeFromCart(id);
    toast.error('تم حذف المنتج ❌');
  };

  const handleClearCart = () => {
    clearCart();
    toast('تم تفريغ السلة 🗑️');
  };

  return (
    <div className="bg-[#26333f] text-white min-h-screen pt-24 px-6 font-[Cairo]">
      <Head>
        <title>سلة التسوق</title>
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href="/cart" />
      </Head>

      {(!items || items.length === 0) ? (
        <div className="text-center">
          <h2 className="text-2xl mb-4">🛒 السلة فارغة</h2>
          <p>يمكنك العودة لتصفح المنتجات وإضافة بعض العناصر إلى السلة.</p>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6 text-center">🛒 سلة التسوق</h1>

          <div className="max-w-4xl mx-auto space-y-4">
            {items.map((item: CartItem) => {
              const title = asSafeText(item.title, 'منتج غير متوفر');
              const brand = asSafeText(item.brand, 'غير محدد'); // إذا كانت العلامة التجارية فارغة، نعرض "غير محدد"
              const imageSrc = asSafeImgSrc(item.image); // استخدام صورة افتراضية إذا لم تكن الصورة موجودة
              const price = asSafeNumber(item.price, 0);
              const quantity = asSafeNumber(item.quantity, 1);

              return (
                <div
                  key={String(item.id)}
                  className="bg-white text-[#26333f] p-4 rounded-lg flex flex-col sm:flex-row items-center gap-4 shadow"
                >
                  <Image
                    src={imageSrc}
                    alt={title || 'منتج'} // إضافة alt وصف للصور
                    width={100}
                    height={140}
                    className="rounded object-cover"
                    loading="lazy"
                  />

                  <div className="flex-1 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center w-full">
                    <div>
                      <h3 className="font-bold">{title}</h3>
                      {/* عرض العلامة التجارية أو "غير محدد" إذا كانت فارغة */}
                      <p className="text-sm text-gray-600">العلامة التجارية: {brand}</p>
                      <p className="text-sm font-semibold mt-1">السعر: {price.toFixed(2)} ر.س</p>
                      <p className="text-sm font-semibold mt-1">
                        الإجمالي: {(price * quantity).toFixed(2)} ر.س
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap">
                      <button
                        onClick={() => handleDecrement(item.id)}
                        className="px-3 py-1 bg-gray-300 rounded text-black font-bold"
                        aria-label="إنقاص الكمية"
                      >
                        -
                      </button>
                      <span className="px-2">{quantity}</span>
                      <button
                        onClick={() => handleIncrement(item.id)}
                        className="px-3 py-1 bg-gray-300 rounded text-black font-bold"
                        aria-label="زيادة الكمية"
                      >
                        +
                      </button>

                      <button
                        onClick={() => handleRemove(item.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:opacity-90"
                      >
                        حذف
                      </button>

                      <a
                        href={`https://wa.me/966500000000?text=${encodeURIComponent(
                          `مرحباً، أرغب في طلب المنتج "${title}" (${quantity} نسخة) من متجر الهواتف.` 
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-green-600 text-white rounded hover:opacity-90 text-sm"
                      >
                        اطلب عبر واتساب
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="max-w-4xl mx-auto mt-6 bg-white text-[#26333f] p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-center gap-4 flex-wrap">
            <div>
              <p className="font-bold text-lg">إجمالي العناصر: {totalCountVal}</p>
              <p className="font-bold text-lg">الإجمالي: {totalPriceVal.toFixed(2)} ر.س</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleClearCart}
                className="bg-red-500 text-white px-4 py-2 rounded hover:opacity-90"
              >
                تفريغ السلة
              </button>
              <a
                href={`https://wa.me/966500000000?text=${encodeURIComponent(
                  `مرحباً، أرغب في طلب المنتجات التالية من متجر الهواتف:\n${items
                    .map((i: CartItem) => {
                      const t = asSafeText(i.title, 'منتج غير متوفر');
                      const q = asSafeNumber(i.quantity, 1);
                      return `- ${t} × ${q}`;
                    })
                    .join('\n')}\nالإجمالي: ${totalPriceVal.toFixed(2)} ر.س`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 text-white px-4 py-2 rounded hover:opacity-90"
              >
                إتمام الطلب عبر واتساب
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
