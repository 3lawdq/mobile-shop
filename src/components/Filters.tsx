"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Option = { name: string; slug: string };

interface FiltersProps {
  categories: Option[];               // تصنيفات المنتجات
  brands: Option[];                   // العلامات التجارية
  colors?: string[];                  // ألوان افتراضية أو من قاعدة البيانات (مثلاً: ["أسود","#000000","أزرق"...])
  selectedCategory?: string;          // slug
  selectedBrand?: string;             // slug
  selectedColor?: string;             // اسم اللون أو كوده
  minPrice?: string;                  // كنص للحفاظ على الإدخال
  maxPrice?: string;
  onChange: (filters: {
    category?: string;
    brand?: string;
    color?: string;
    min?: string;
    max?: string;
  }) => void;
}

export default function Filters({
  categories,
  brands = [],  // التأكد من أن brands هو مصفوفة فارغة في حال لم يتم تمريرها
  colors = [],
  selectedCategory = "",
  selectedBrand = "",
  selectedColor = "",
  minPrice = "",
  maxPrice = "",
  onChange,
}: FiltersProps) {
  const [category, setCategory] = useState(selectedCategory);
  const [brand, setBrand] = useState(selectedBrand);
  const [color, setColor] = useState(selectedColor);
  const [min, setMin] = useState(minPrice);
  const [max, setMax] = useState(maxPrice);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // منع أحرف غير رقمية في السعر (يسمح بنقطة)
  const normalizePrice = (v: string) => v.replace(/[^\d.]/g, "");

  const applyFilters = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange({
        category: category || undefined,
        brand: brand || undefined,
        color: color || undefined,
        min: min || undefined,
        max: max || undefined,
      });
    }, 300);
  }, [category, brand, color, min, max, onChange]);

  useEffect(() => {
    applyFilters();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [category, brand, color, min, max, applyFilters]);

  const reset = () => {
    setCategory("");
    setBrand("");
    setColor("");
    setMin("");
    setMax("");
    onChange({});
  };

  return (
    <div className="grid gap-3 p-4 rounded-2xl border bg-white">
      {/* التصنيف */}
      <label className="text-sm font-medium text-gray-700">
        التصنيف
        <select
          className="mt-1 w-full border p-2 rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">كل التصنيفات</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* العلامة التجارية */}
      <label className="text-sm font-medium text-gray-700">
        العلامة التجارية
        <select
          className="mt-1 w-full border p-2 rounded"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        >
          <option value="">كل العلامات</option>
          {brands.length > 0 ? (
            brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name} {/* تم التأكد من التعامل مع name بدلاً من brand */}
              </option>
            ))
          ) : (
            <option disabled>لا توجد ماركات متاحة</option>
          )}
        </select>
      </label>

      {/* اللون (اختياري) */}
      {colors.length > 0 && (
        <label className="text-sm font-medium text-gray-700">
          اللون
          <select
            className="mt-1 w-full border p-2 rounded"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          >
            <option value="">أي لون</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* السعر */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-1">السعر</div>
        <div className="flex gap-2">
          <input
            className="border p-2 rounded w-full"
            inputMode="decimal"
            placeholder="سعر أدنى"
            value={min}
            onChange={(e) => setMin(normalizePrice(e.target.value))}
          />
          <input
            className="border p-2 rounded w-full"
            inputMode="decimal"
            placeholder="سعر أقصى"
            value={max}
            onChange={(e) => setMax(normalizePrice(e.target.value))}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={applyFilters}
          className="px-4 py-2 rounded-2xl border hover:bg-gray-50"
        >
          تطبيق
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-2xl border hover:bg-gray-50"
        >
          إعادة تعيين
        </button>
      </div>
    </div>
  );
}
