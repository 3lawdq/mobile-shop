'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 24;

export default function BrandsList() {
  const router = useRouter();
  const [brands, setBrands] = useState<any[]>([]);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  useEffect(() => {
    setLoading(true);
    const fetchBrands = async () => {
      try {
        const { data, count, error } = await supabase
          .from('brands')
          .select('*', { count: 'exact' })
          .range(from, to);

        if (error) {
          console.error('Error fetching brands:', error);
          return;
        }

        setBrands(data);
        setHasNext(count ? to + 1 < count : data.length === PAGE_SIZE);
      } catch (error) {
        console.error('Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, [page, from, to]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.push(`/brands?page=${newPage}`);
  };

  return (
    <div className="bg-[#26333f] text-white min-h-screen pt-24 px-6 font-[Cairo]">
      <div className="max-w-6xl mx-auto bg-white text-[#26333f] p-6 rounded-lg shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">البراندات</h1>
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
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => router.push(`/brands/${brand.slug}`)} // الضغط على البراند يوجه إلى صفحة المنتجات
              >
                <img src={brand.logo_url || '/vercel.svg'} alt={brand.name} className="h-24 w-24 object-contain" />
                <span className="mt-2 text-center">{brand.name}</span>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} hasNext={hasNext} onPageChange={handlePageChange} />
      </div>
    </div>
  );
}
