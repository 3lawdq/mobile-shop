'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';

type ProductRow = {
  id: number;
  name: string;
  slug: string | null;
  final_price: number | null;
  rating: number | null;
  thumbnail_url: string | null;
  brands: { name: string | null }[];  // تعديلات هنا: يجب أن تكون brands مصفوفة من الكائنات
};

type Props = {
  mode?: 'overlay' | 'inline';
  placeholder?: string;
  limit?: number;
};

export default function SearchBar({
  mode = 'overlay',
  placeholder = 'ابحث عن منتج...',
  limit = 8,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductRow[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);  // استخدام useRef هنا
  const wrapRef = useRef<HTMLDivElement | null>(null);  // استخدام useRef هنا

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      setQ('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (mode !== 'inline') return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ('');
        setResults([]);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [mode]);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const term = q.trim();
      if (term.length < 2) {
        if (alive) setResults([]);
        return;
      }
      setLoading(true);

      // نبحث في products بالاسم + نجلِب اسم العلامة (brands.name) إن وُجد FK
      const { data, error } = await supabase
        .from('products')
        .select('id,name,slug,final_price,rating,thumbnail_url,brands(name)')
        .ilike('name', `%${term}%`)
        .limit(limit);

      if (!alive) return;
      setLoading(false);

      if (error) {
        console.error('Supabase error:', error);
        setResults([]);
        return;
      }
      setResults((data ?? []) as ProductRow[]);
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, limit]);

  const TriggerButton = (
    <button
      aria-label="بحث"
      onClick={() => setOpen(true)}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full ring-1 ring-black/5 bg-white hover:bg-gray-50 transition"
    >
      <FiSearch className="text-gray-600 text-[18px]" />
    </button>
  );

  const Bar = (
    <div className="flex items-center h-14 rounded-full bg-white/95 backdrop-blur shadow-md ring-1 ring-black/5 px-4 gap-3">
      <FiSearch className="text-gray-500 text-[18px]" />
      <input
        ref={inputRef}
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
        dir="rtl"
      />
      <button
        aria-label="إغلاق البحث"
        onClick={() => setOpen(false)}
        className="text-gray-500 hover:text-gray-700 transition"
      >
        <FiX size={20} />
      </button>
    </div>
  );

  const Results = (
    (loading || results.length > 0 || (q.trim().length >= 2 && !loading)) && (
      <div className="bg-white border-t border-gray-100 shadow-lg max-h-[70vh] overflow-auto">
        {loading && <div className="p-4 text-sm text-gray-500">جارٍ البحث…</div>}

        {!loading && results.length === 0 && q.trim().length >= 2 && (
          <div className="p-4 text-sm text-gray-500">لا توجد نتائج</div>
        )}

        {!loading &&
          results.map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.slug ?? p.id}`}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 transition"
              onClick={() => setOpen(false)}
            >
              <Image
                src={p.thumbnail_url ?? '/images/placeholders/phone-placeholder.jpg'}
                alt={p.name}
                width={40}
                height={60}
                className="rounded object-cover"
                unoptimized
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-700 truncate">
                  {p.name}
                </div>
                {p.brands?.[0]?.name && (
                  <div className="text-xs text-gray-500 truncate">
                    {p.brands[0].name}
                  </div>
                )}
                <div className="text-[12px] text-gray-500 flex items-center gap-3">
                  <span>{typeof p.final_price === 'number' ? `${p.final_price} ر.س` : '—'}</span>
                  <span className="text-yellow-600">⭐ {typeof p.rating === 'number' ? p.rating : '—'}</span>
                </div>
              </div>
            </Link>
          ))}
      </div>
    )
  );

  if (mode === 'overlay') {
    return (
      <div className="relative">
        {!open ? (
          TriggerButton
        ) : (
          <div className="fixed top-2 inset-x-0 z-[60]">
            <div className="mx-auto max-w-7xl px-4">{Bar}</div>
            <div className="absolute top-14 inset-x-0">
              <div className="mx-auto max-w-7xl px-4">{Results}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapRef}>
      {!open ? (
        TriggerButton
      ) : (
        <div className="w-[18rem] md:w-80">{Bar}</div>
      )}
      {open && (
        <div className="absolute mt-2 w-[18rem] md:w-80 z-50 rounded-xl overflow-hidden">
          {Results}
        </div>
      )}
    </div>
  );
}
