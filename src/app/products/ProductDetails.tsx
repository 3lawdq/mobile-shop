'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';  // استيراد useRouter من next/router
import { supabaseBrowser as supabase } from '@lib/supabaseClient';  // تأكد من المسار الصحيح لعميل Supabase
import { Product } from '@/types';  // تأكد من المسار الصحيح للأنواع الخاصة بالمنتج

const ProductDetails = () => {
  const router = useRouter();
  const { id } = router.query;  // الحصول على المعرف من المسار
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // جلب تفاصيل المنتج من Supabase
  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching product:', error);
        } else {
          setProduct(data);
        }
        setLoading(false);
      };

      fetchProduct();
    }
  }, [id]);

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  if (!product) {
    return <div>لم يتم العثور على المنتج</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{product.name}</h1>

      {/* عرض صورة المنتج */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        <img
          src={product.thumbnail_url || '/fallback-product.png'}  // استخدام صورة افتراضية إذا كانت الصورة غير متوفرة
          alt={product.name}
          className="w-full md:w-1/2 h-auto object-cover rounded-md"
        />

        {/* عرض تفاصيل المنتج */}
        <div className="space-y-4">
          <p className="text-lg font-bold text-primary">{product.final_price || product.price} ر.س</p>
          <p className="text-sm text-gray-600">{product.description}</p>

          {/* عرض التقييمات */}
          <div className="flex items-center space-x-2">
            <span className="text-yellow-500">⭐⭐⭐⭐</span>
            <span className="text-sm text-gray-500">(4.0/5)</span>
          </div>

          <button className="w-full bg-primary text-white py-2 rounded-md hover:bg-orange-600 transition-colors duration-300">
            إضافة إلى السلة
          </button>
        </div>
      </div>

      {/* صور إضافية */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">صور إضافية</h2>
        <div className="flex gap-4 overflow-x-auto">
          <img
            src={product.thumbnail_url || '/fallback-product.png'}  // استخدام صورة افتراضية هنا أيضًا
            alt={product.name}
            className="w-24 h-24 object-cover rounded-md cursor-pointer"
          />
          {/* يمكنك إضافة صور إضافية هنا إذا كانت متوفرة */}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
