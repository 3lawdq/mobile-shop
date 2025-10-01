'use client';

import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { supabaseBrowser } from '@lib/supabaseClient';

type Category = {
  id: number;
  name: string;
};

type ProductRow = {
  id: number | string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  rating: number;
  image: string;
  is_new: boolean;
  is_trending: boolean;
  discount_percent: number;
  stock: number;
};

type Props = {
  categoryFilter?: string;
  searchQuery?: string;
};

export default function ProductGrid({ categoryFilter, searchQuery }: Props) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabaseBrowser
          .from('products')
          .select('*')
          .ilike('title', `%${searchQuery || ''}%`)
          .ilike('category', `%${categoryFilter || ''}%`)
          .order('created_at', { ascending: false });

        if (error) {
          setError('❌ حدث خطأ في جلب المنتجات');
        } else {
          setProducts(data as ProductRow[]);
        }
      } catch (err) {
        setError('❌ فشل في جلب البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryFilter, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center font-[Cairo]">
        <p>جاري تحميل المنتجات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center font-[Cairo]">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] py-10 px-4 font-[Cairo]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
