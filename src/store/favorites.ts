"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** عنصر المفضلة في متجر الهواتف */
export type FavoriteProduct = {
  id: string | number;
  name: string;               // اسم المنتج (بديل title)
  price: number;
  image: string;              // صورة جاهزة للعرض
  slug?: string;              // /product/[slug]
  rating?: number;

  // تصنيف/علامة
  category_id?: number | string;
  category?: string;
  brand_id?: number | string;
  brand_name?: string;

  // ميزات إضافية للهواتف
  identity?: string;          // الطراز/الهوية (مثال: iPhone 15 Pro 256GB)
  base_color?: string;        // اللون الأساسي (hex أو اسم)
  near_color?: string;        // لون مقارب/ثانوي

  // حقول اختيارية للتوافق
  tags?: string[];
  created_at?: string | null;
  thumbnail_url?: string;
};

interface FavoriteState {
  favorites: FavoriteProduct[];

  // Actions
  toggleFavorite: (product: FavoriteProduct) => void;
  removeFavorite: (id: string | number) => void;
  isFavorite: (id: string | number) => boolean;
  clear: () => void;
}

// مقارنة آمنة للـ id
const sameId = (a: string | number, b: string | number) => String(a) === String(b);

// تخزين آمن في بيئة Next
const safeStorage = createJSONStorage<Pick<FavoriteState, "favorites">>(() => {
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

export const useFavoritesStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favorites: [],

      toggleFavorite: (product) => {
        const favs = get().favorites;
        const exists = favs.find((p) => sameId(p.id, product.id));
        if (exists) {
          set({ favorites: favs.filter((p) => !sameId(p.id, product.id)) });
        } else {
          set({ favorites: [...favs, product] });
        }
      },

      removeFavorite: (id) => {
        set({ favorites: get().favorites.filter((p) => !sameId(p.id, id)) });
      },

      isFavorite: (id) => get().favorites.some((p) => sameId(p.id, id)),

      clear: () => set({ favorites: [] }),
    }),
    {
      name: "favorites-storage",
      version: 2,
      storage: safeStorage,
      /** ترحيل مرن من صيغة مشروع الكتب (FavoriteBook) إلى FavoriteProduct */
      migrate: (persisted: unknown): { favorites: FavoriteProduct[] } => {
        const src = (persisted as any)?.favorites;
        if (!Array.isArray(src)) return { favorites: [] };

        const favorites: FavoriteProduct[] = src.map((old: any) => {
          // نحاول أخذ الاسم/الصورة من مفاتيح قديمة أيضاً
          const name =
            (typeof old.name === "string" && old.name) ||
            (typeof old.title === "string" && old.title) ||
            "منتج";
          const image =
            (typeof old.image === "string" && old.image) ||
            (typeof old.thumbnail_url === "string" && old.thumbnail_url) ||
            (typeof old.cover_url === "string" && old.cover_url) ||
            "/images/placeholders/phone-placeholder.jpg";

          return {
            id: old.id,
            name,
            price: typeof old.price === "number" ? old.price : 0,
            image,
            slug: typeof old.slug === "string" ? old.slug : undefined,
            rating: typeof old.rating === "number" ? old.rating : undefined,

            // قد لا تتوفر هذه الحقول في هيكلة الكتب
            category_id: old.category_id,
            category: old.category,
            brand_id: old.brand_id,
            brand_name: old.brand_name,

            identity: old.identity,
            base_color: old.base_color,
            near_color: old.near_color,

            tags: Array.isArray(old.tags) ? old.tags : undefined,
            created_at: typeof old.created_at === "string" ? old.created_at : null,
            thumbnail_url: typeof old.thumbnail_url === "string" ? old.thumbnail_url : undefined,
          };
        });

        return { favorites };
      },
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
);
