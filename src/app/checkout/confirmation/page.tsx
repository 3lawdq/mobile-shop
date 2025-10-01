"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseBrowser } from "@lib/supabaseClient";

interface OrderItem {
  title: string;
  image: string;
  price: number;
  quantity: number;
  category?: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  notes: Record<string, string>;
  total: number;
  created_at: string;
  status: string;
  user_id?: string | null;
  customer_info: {
    fullName: string;
    phone: string;
    address: string;
    contactMethod: "whatsapp" | "call" | string;
  };
}

const fallbackImage = "/fallback-product.png";

export default function ConfirmationPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchLatestOrder = async () => {
      try {
        const {
          data: { user },
        } = await supabaseBrowser.auth.getUser();

        if (user?.id) {
          const { data, error } = await supabaseBrowser
            .from("orders")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!error && data) {
            setOrder(data as Order);
            return;
          }
        }

        const { data: anyOrder, error: anyErr } = await supabaseBrowser
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (anyErr) {
          console.error("Error fetching order:", anyErr.message);
          return;
        }

        setOrder(anyOrder as Order);
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error("Unexpected error fetching order:", err.message);
        } else {
          console.error("Unexpected error fetching order:", err);
        }
      }
    };

    fetchLatestOrder();
  }, []);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center font-[Cairo]">
        <p className="text-gray-500 text-lg">جاري تحميل تفاصيل الطلب...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] py-20 px-4 font-[Cairo]">
      <div className="max-w-3xl mx-auto bg-white shadow rounded p-8">
        <h1 className="text-3xl font-bold text-[#26333f] mb-4 text-center">
          🎉 تم استلام طلبك بنجاح
        </h1>
        <p className="text-center text-gray-600 mb-6">
          رقم الطلب: <span className="font-semibold">{order.id}</span>
        </p>

        <div className="grid gap-2 mb-6 text-sm text-gray-700 bg-[#f1f1f1] p-4 rounded">
          <p>
            <strong>الاسم:</strong> {order.customer_info.fullName}
          </p>
          <p>
            <strong>رقم الهاتف:</strong> {order.customer_info.phone}
          </p>
          <p>
            <strong>العنوان:</strong> {order.customer_info.address}
          </p>
          <p>
            <strong>طريقة التواصل:</strong>{" "}
            {order.customer_info.contactMethod === "whatsapp" ? "واتساب" : "اتصال"}
          </p>
        </div>

        <h2 className="text-lg font-bold mb-4">تفاصيل المنتجات المطلوبة:</h2>
        <div className="space-y-4 mb-6">
          {order.items.map((item, idx) => {
            const notesValues = Object.values(order.notes || {});
            const idxKey = String(idx);
            const noteText =
              (order.notes && order.notes[idxKey]) || notesValues[idx] || "";

            return (
              <div key={idx} className="flex items-start gap-4 border-b pb-4">
                <Image
                  src={typeof item.image === "string" && item.image ? item.image : fallbackImage}
                  alt={item.title}
                  width={60}
                  height={80}
                  className="rounded object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.category && (
                    <p className="text-sm text-gray-400">التصنيف: {item.category}</p>
                  )}
                  <p className="text-sm">الكمية: {item.quantity}</p>
                  <p className="text-sm">السعر الفردي: {item.price} ر.س</p>
                  <p className="text-sm font-medium">
                    الإجمالي: {(item.price * item.quantity).toFixed(2)} ر.س
                  </p>
                  {noteText && (
                    <p className="text-sm text-gray-600 mt-1">ملاحظة: {noteText}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-end text-xl font-semibold mb-6">
          المجموع الكلي: {order.total.toFixed(2)} ر.س
        </div>

        <p className="text-center text-gray-500 mb-6">
          سيتم التواصل معك خلال 24 ساعة عبر{" "}
          {order.customer_info.contactMethod === "whatsapp" ? "واتساب" : "الاتصال"} لتأكيد الطلب.
        </p>

        <button
          onClick={() => router.push("/")}
          className="block mx-auto bg-[#b89c70] text-white py-3 px-6 rounded hover:opacity-90 transition"
        >
          العودة إلى الرئيسية
        </button>
      </div>
    </div>
  );
}
