import { supabaseBrowser as supabase } from '@lib/supabaseClient'; // تأكد من أن المسار صحيح

// تعريف نوع البيانات الخاصة بالتصنيفات
export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at: string;
};

// حارس النوع للتأكد من أن البيانات هي نوع Category
function isCategory(item: any): item is Category {
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.slug === 'string' &&
    typeof item.created_at === 'string'
  );
}

// وظيفة لجلب جميع التصنيفات
export const getAllCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // تحقق من هيكل البيانات المسترجعة
    console.log('Fetched categories data:', data);

    // تأكد من أن البيانات تتوافق مع Category[] باستخدام isCategory
    if (Array.isArray(data)) {
      // فلترة البيانات بناءً على حارس النوع
      const validCategories = data.filter(isCategory);

      // إذا كانت البيانات صحيحة، أعِد تحويلها إلى Category[]
      return validCategories;
    }
    return [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// وظيفة لجلب تصنيف بناءً على الـ ID أو الـ Slug
export const getCategoryByIdOrSlug = async (slugOrId: string) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
      .single();

    if (error) throw new Error(error.message);

    // تحقق من هيكل البيانات المسترجعة
    console.log('Fetched single category data:', data);

    // التحقق من أن البيانات تتوافق مع Category
    if (isCategory(data)) {
      return data;
    }
    throw new Error('Invalid category data');
  } catch (error) {
    console.error('Error fetching category:', error);
    throw error;
  }
};

// وظائف أخرى (إضافة، تحديث، حذف) بنفس الطريقة باستخدام isCategory حارس النوع
