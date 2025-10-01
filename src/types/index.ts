// src/types/index.ts

export type Product = {
  id: string | number;         // معرف المنتج (من نوع bigint في قاعدة البيانات)
  name: string;                // اسم المنتج (من نوع text)
  description: string;         // وصف المنتج (من نوع text)
  price: number;               // السعر الأصلي (من نوع numeric)
  final_price?: number;        // السعر النهائي (من نوع numeric) (اختياري)
  thumbnail_url?: string;      // رابط الصورة المصغرة (من نوع text) (اختياري)
  specs?: Record<string, any>; // مواصفات المنتج (من نوع jsonb) (اختياري)
  condition?: string;          // شرط المنتج (من نوع USER-DEFINED) (اختياري)
  is_active: boolean;          // هل المنتج نشط؟ (من نوع boolean)
  rating?: number;             // التقييم (من نوع numeric) (اختياري)
  created_at: string;          // تاريخ الإنشاء (من نوع timestamp)
  category_id: string | number; // معرف الفئة (من نوع bigint)
  is_new: boolean;             // هل المنتج جديد؟ (من نوع boolean)
  is_trending: boolean;        // هل المنتج رائج؟ (من نوع boolean)
  discount_percent?: number;   // نسبة الخصم (من نوع numeric) (اختياري)
  stock: number;               // كمية المنتج في المخزون (من نوع integer)
  updated_at: string;          // تاريخ آخر تحديث (من نوع timestamp with time zone)
  slug: string;                // اسم المنتج في الـ URL (من نوع text)
  brand_id: string | number;   // معرف العلامة التجارية (من نوع bigint)
};
