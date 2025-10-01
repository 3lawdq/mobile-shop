'use client';

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** نوع موحّد لعناصر السلة في متجر الهواتف */
export type CartProduct = {
  id: string | number;     // product id
  name: string;            // اسم المنتج (بديل title)
  price: number;           // السعر النهائي للعرض/الشراء
  image: string;           // صورة مصغّرة/رئيسية جاهزة للعرض
  slug?: string;           // /product/[slug]
  rating?: number;         // 0..5 (اختياري)

  // معلومات تصنيف/علامة
  category_id?: number | string;
  category?: string;
  brand_id?: number | string;
  brand_name?: string;

  // ميزات إضافية لمتجر الهواتف
  identity?: string;       // الهوية/الطراز (مثل: iPhone 15 Pro 256GB)
  base_color?: string;     // اللون الأساسي (Hex أو اسم)
  near_color?: string;     // لون مقارب/ثانوي لواجهة المنتج

  // حقول ملائمة/اختيارية للتوافق المستقبلي
  note?: string;
  thumbnail_url?: string;
  created_at?: string;
};

type CartItem = CartProduct & { quantity: number };

interface CartState {
  items: CartItem[];

  // Cart actions
  addToCart: (product: CartProduct, qty?: number) => void;
  removeFromCart: (id: string | number) => void;
  setQuantity: (id: string | number, qty: number) => void;
  increment: (id: string | number) => void;
  decrement: (id: string | number) => void;
  clearCart: () => void;
  /** alias اختياري للتوافق */
  clear: () => void;

  // Derived values
  totalPrice: () => number;
  totalCount: () => number;
}

// مقارنة آمنة للـ id حتى لو اختلف النوع بين number/string
const sameId = (a: string | number, b: string | number) => String(a) === String(b);

/** تخزين آمن مع Next.js */
const safeStorage = createJSONStorage<Pick<CartState, "items">>(() => {
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    return window.localStorage;
  }
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    key: () => null,
    length: 0,
    clear: () => {},
  } as unknown as Storage;
});

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      // ------------------ Cart ------------------
      addToCart: (product, qty = 1) => {
        const items = get().items;
        const existing = items.find((it) => sameId(it.id, product.id));
        const addQty = Math.max(1, Math.floor(qty));

        if (existing) {
          set({
            items: items.map((it) =>
              sameId(it.id, product.id)
                ? { ...it, quantity: it.quantity + addQty }
                : it
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                ...product,
                name: product.name || "منتج غير متوفر", // تعيين اسم افتراضي
                brand_name: product.brand_name || "غير محدد", // تعيين علامة تجارية افتراضية
                image: product.image || "/fallback-product.png", // تعيين صورة افتراضية
                quantity: addQty,
              },
            ],
          });
        }
      },

      removeFromCart: (id) => {
        set({ items: get().items.filter((it) => !sameId(it.id, id)) });
      },

      setQuantity: (id, qty) => {
        const q = Math.floor(qty);
        if (q <= 0) {
          set({ items: get().items.filter((it) => !sameId(it.id, id)) });
          return;
        }
        set({
          items: get().items.map((it) =>
            sameId(it.id, id) ? { ...it, quantity: q } : it
          ),
        });
      },

      increment: (id) => {
        set({
          items: get().items.map((it) =>
            sameId(it.id, id) ? { ...it, quantity: it.quantity + 1 } : it
          ),
        });
      },

      decrement: (id) => {
        set({
          items: get().items
            .map((it) =>
              sameId(it.id, id) ? { ...it, quantity: it.quantity - 1 } : it
            )
            .filter((it) => it.quantity > 0),
        });
      },

      clearCart: () => set({ items: [] }),
      clear: () => set({ items: [] }),

      // ------------------ Derived ------------------
      totalPrice: () =>
        get().items.reduce((sum, it) => sum + it.price * it.quantity, 0),

      totalCount: () =>
        get().items.reduce((sum, it) => sum + it.quantity, 0),
    }),
    {
      name: "cart-storage",
      version: 4,
      storage: safeStorage,
      /** ترحيل مرن من نسخ سابقة (مثلاً كانت عناصر من مشروع الكتب) */
      migrate: (persistedState: unknown): { items: CartItem[] } => {
        if (!persistedState) return { items: [] };

        const anyState = persistedState as { items?: any[] };
        const src = Array.isArray(anyState.items) ? anyState.items : [];
        const items: CartItem[] = src.map((old: any) => {
          const name =
            (typeof old.name === "string" && old.name) ||
            (typeof old.title === "string" && old.title) ||
            "منتج غير متوفر"; // استخدم اسم افتراضي إذا كان فارغًا
          const image =
            (typeof old.image === "string" && old.image) ||
            (typeof old.thumbnail_url === "string" && old.thumbnail_url) ||
            (typeof old.cover_url === "string" && old.cover_url) ||
            "/images/placeholders/phone-placeholder.jpg"; // استخدم صورة افتراضية

          return {
            id: old.id,
            name,
            price: typeof old.price === "number" ? old.price : 0,
            image,
            slug: typeof old.slug === "string" ? old.slug : undefined,
            rating: typeof old.rating === "number" ? old.rating : undefined,

            category_id: old.category_id,
            category: old.category,

            brand_id: old.brand_id,
            brand_name: old.brand_name || "غير محدد", // تأكد من أن العلامة التجارية محددة

            identity: old.identity,
            base_color: old.base_color,
            near_color: old.near_color,

            note: old.note,
            thumbnail_url: old.thumbnail_url,
            created_at: old.created_at,

            quantity: Math.max(1, Number.isFinite(old.quantity) ? Number(old.quantity) : 1),
          };
        });

        return { items };
      },
      partialize: (state) => ({ items: state.items }),
    }
  )
);
