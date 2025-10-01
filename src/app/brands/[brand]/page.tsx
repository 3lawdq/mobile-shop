'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';
import ProductCard from '@/components/ProductCard';
import Pagination from '@/components/Pagination';
import { toast } from 'react-hot-toast';

const PAGE_SIZE = 24;

export default function BrandPage() {
  const { brand } = useParams();  // أخذ اسم البراند من المعاملات في URL
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  useEffect(() => {
    setLoading(true);

    const fetchProducts = async () => {
      try {
        // 1. جلب brand_id من جدول brands باستخدام slug
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('id')
          .eq('slug', brand)
          .single();

        if (brandError || !brandData) {
          const msg = brandError?.message || 'Brand not found';
          console.error('Error fetching brand_id:', msg);
          toast.error(`Error: ${msg}`);
          setProducts([]);
          setHasNext(false);
          return;
        }

        const brandId = brandData.id; // استخدام brand_id الرقمي

        // 2. جلب المنتجات باستخدام brand_id مع التحقق من stock > 0 (التوفر)
        const { data, count, error } = await supabase
          .from('products')
          .select('id, name, price, rating, brand_id, description, thumbnail_url, stock')
          .eq('brand_id', brandId)
          .gt('stock', 0)  // تصفية المنتجات التي في المخزن فقط
          .range(from, to);

        if (error) {
          const errorMessage = error.message || 'Unknown error occurred';
          console.error('Error fetching products:', errorMessage);
          toast.error(`Error fetching products: ${errorMessage}`);
          return;
        }

        setProducts(data);
        setHasNext(count ? to + 1 < count : data.length === PAGE_SIZE);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Unexpected error:', errorMessage);
        toast.error(`Unexpected error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [brand, page, from, to]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.push(`/brands/${brand}?page=${newPage}`);
  };

  return (
    <div className="bg-[#26333f] text-white min-h-screen pt-24 px-6 font-[Cairo]">
      <div className="max-w-6xl mx-auto bg-white text-[#26333f] p-6 rounded-lg shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">{brand}</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="h-40 bg-gray-100 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                  <div className="h-8 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-center text-gray-500">لا توجد منتجات متوفرة لهذا البراند.</p>
        )}

        <Pagination page={page} hasNext={hasNext} onPageChange={handlePageChange} />
      </div>
    </div>
  );
}
