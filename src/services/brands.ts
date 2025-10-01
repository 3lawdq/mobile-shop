import { supabaseBrowser as supabase } from '@lib/supabaseClient'; // تأكد من أن المسار صحيح

// تعريف نوع البيانات الخاصة بالعلامات التجارية
export type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  created_at: string;
};

// وظيفة لجلب جميع العلامات التجارية
export const getAllBrands = async () => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // تحويل البيانات إلى النوع المطلوب (Brand)
    return data?.map((item: any) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      logo_url: item.logo_url || null,
      created_at: item.created_at,
    })) as Brand[]; // تحويل البيانات إلى النوع Brand[]
  } catch (error) {
    console.error('Error fetching brands:', error);
    throw error;
  }
};

// وظيفة لجلب علامة تجارية بناءً على الـ ID أو الـ Slug
export const getBrandByIdOrSlug = async (slugOrId: string) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
      .single();

    if (error) throw new Error(error.message);

    // تحويل البيانات إلى النوع المطلوب
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      logo_url: data.logo_url || null,
      created_at: data.created_at,
    } as Brand;
  } catch (error) {
    console.error('Error fetching brand:', error);
    throw error;
  }
};

// وظائف أخرى بنفس الفكرة (إضافة، تحديث، حذف) يمكن تطبيق نفس التحويل عليها أيضًا.
