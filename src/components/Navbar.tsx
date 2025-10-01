// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import React, { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FaShoppingCart, FaUser } from 'react-icons/fa';
import { HiHeart } from 'react-icons/hi';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';

type ProductLite = {
  id: string | number;
  slug?: string | null;
  name?: string | null;
  brand_name?: string | null; // إن كانت موجودة عبر view/relationship، وإلا نهملها
  thumbnail_url?: string | null;
  price?: number | null;
  rating?: number | null;
};

// helper آمن لاستخراج النص من user_metadata
function getString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!meta) return null;
  const v = meta[key];
  return typeof v === 'string' ? v : null;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const { user, role, isAdmin, displayName, displayEmail, loading: authLoading, logout } = useAuth();

  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const favorites = useFavoritesStore((s) => s.favorites);
  const clearFavs = useFavoritesStore((s) => s.clear);

  const totalCount = items.reduce((acc, it) => acc + it.quantity, 0);
  const totalFavorites = favorites.length;

  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // ===== البحث اللحظي =====
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [results, setResults] = useState<ProductLite[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // قائمة الجوال
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // إغلاق عناصر الـ UI عند الضغط خارجها
  useEffect(() => {
    const clickOut = (e: MouseEvent) => {
      const t = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(t)) setUserMenuOpen(false);
      if (searchWrapRef.current && !searchWrapRef.current.contains(t)) setSearchOpen(false);
      if (mobileRef.current && !mobileRef.current.contains(t)) setMobileOpen(false);
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  // ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // تركيز خانة البحث عند فتحها
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [searchOpen]);

  // إغلاق القوائم عند تغيير المسار
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // ===== Debounced live search لـ products =====
  useEffect(() => {
    let alive = true;

    if (!searchOpen) {
      setResults([]);
      setActiveIdx(-1);
      setSearchLoading(false);
      setSearchErr(null);
      return;
    }

    const qRaw = searchText.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (qRaw.length < 1) {
      setResults([]);
      setActiveIdx(-1);
      setSearchLoading(false);
      setSearchErr(null);
      return;
    }

    // تطبيع بسيط للأحرف العربية
    const normalize = (s: string) =>
      s
        .replace(/[أإآا]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[ى]/g, 'ي')
        .replace(/\s+/g, ' ')
        .trim();

    const q = normalize(qRaw);

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchErr(null);
      try {
        // 1) يبدأ بالاسم q
        const { data: pfx, error: e1 } = await supabase
          .from('products')
          .select('id, slug, name, thumbnail_url, price, rating')
          .ilike('name', `${q}%`)
          .limit(10);

        if (e1) throw e1;

        let rows = (pfx || []) as ProductLite[];

        // 2) إن كانت قليلة: يحتوي q في الاسم
        if (rows.length < 10) {
          const { data: infix, error: e2 } = await supabase
            .from('products')
            .select('id, slug, name, thumbnail_url, price, rating')
            .ilike('name', `%${q}%`)
            .limit(10);

          if (e2) throw e2;

          const map = new Map<string | number, ProductLite>();
          rows.forEach((r) => map.set(r.id, r));
          (infix || []).forEach((r) => {
            const item = r as ProductLite;
            if (!map.has(item.id)) map.set(item.id, item);
          });
          rows = Array.from(map.values()).slice(0, 10);
        }

        // 3) محاولة FTS اختيارية
        if (rows.length === 0) {
          const { data: fts, error: e3 } = await supabase
            .from('products')
            .select('id, slug, name, thumbnail_url, price, rating')
            .textSearch('name', q, { type: 'websearch' })
            .limit(10);

          if (!e3 && fts?.length) rows = fts as ProductLite[];
        }

        if (!alive) return;
        setResults(rows);
        setActiveIdx(rows.length ? 0 : -1);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Search error:', msg);
        if (!alive) return;
        setSearchErr('حدث خطأ أثناء البحث');
        setResults([]);
        setActiveIdx(-1);
      } finally {
        if (alive) setSearchLoading(false);
      }
    }, 200);

    return () => {
      alive = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, searchOpen]);

  const isActive = (href: string) =>
    pathname === href ? 'text-gray-900 font-bold' : 'text-gray-700 hover:text-gray-900';

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      try {
        clearCart?.();
        clearFavs?.();
        localStorage.removeItem('user');
      } catch {
        // no-op
      }
      setUserMenuOpen(false);
      router.replace('/login?message=' + encodeURIComponent('تم تسجيل الخروج بنجاح'));
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const goToProduct = (p: ProductLite) => {
    const href = p.slug ? `/product/${p.slug}` : `/product/${p.id}`;
    setSearchOpen(false);
    router.push(href);
  };

  // تنقل عبر الأسهم و Enter على النتائج
  const onSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = results[activeIdx];
      if (chosen) goToProduct(chosen);
    }
  };

  // صورة الحساب من user_metadata بطريقة مؤمنة الأنواع
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const avatarUrl =
    getString(meta, 'avatar_url') ||
    getString(meta, 'picture') ||
    getString(meta, 'image') ||
    getString(meta, 'avatar') ||
    null;

  const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : 'م';

  if (authLoading) {
    return (
      <header className="fixed top-4 inset-x-0 z-[60]">
        <div className="mx-auto w-[92%] max-w-7xl rounded-full bg-white shadow-lg ring-1 ring-black/5 px-4 py-2.5 text-gray-900">
          جارِ التحقق من الجلسة…
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-4 inset-x-0 z-[60]">
      <div
        className={[
          'relative',
          'mx-auto w-[92%] max-w-7xl rounded-full bg-white overflow-visible',
          'px-3 md:px-5 py-2.5 md:py-3',
          'flex items-center gap-3 md:gap-5',
          'shadow-lg ring-1 ring-black/5',
          scrolled ? 'shadow-xl' : '',
          'transition-shadow',
        ].join(' ')}
      >
        {/* يمين: زر القائمة + الشعار + اسم المتجر + عروض (ديسكتوب) */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            className="md:hidden inline-grid place-items-center w-9 h-9 rounded-full ring-1 ring-black/5 hover:bg-gray-50"
            aria-label="القائمة"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="الصفحة الرئيسية">
            <Image src="/mobile-shop-logo.png" alt="شعار Mobile Shop" width={36} height={36} className="rounded-sm" />
            <span className="inline text-primary font-extrabold max-w-[110px] md:max-w-none truncate">
              برج الجوال
            </span>
          </Link>

          <Link
            href="/deals"
            className="hidden md:inline-flex items-center rounded-full bg-primary text-white px-4 py-2 text-sm hover:opacity-95"
          >
            عروض اليوم!
          </Link>
        </div>

        {/* وسط: الروابط (ديسكتوب) */}
        <nav
          className={[
            'hidden md:flex flex-1 justify-center items-center gap-6 text-sm',
            searchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100',
            'transition-opacity',
          ].join(' ')}
        >
          <Link href="/" className={isActive('/')}>الرئيسية</Link>
          <Link href="/phones" className={isActive('/phones')}>الهواتف</Link>
          <Link href="/accessories" className={isActive('/accessories')}>الإكسسوارات</Link>
          <Link href="/brands" className={isActive('/brands')}>العلامات</Link>
          <Link href="/categories" className={isActive('/categories')}>التصنيفات</Link>
          <Link href="/about" className={isActive('/about')}>من نحن</Link>
          <Link href="/shipping" className="text-gray-700 hover:text-gray-900">الشحن والدفع</Link>
          <Link href="/contact" className={isActive('/contact')}>تواصل</Link>
        </nav>

        {/* يسار: صورة المستخدم ← المفضلة ← السلة ← البحث */}
        <div
          dir="ltr"
          className={[
            'flex items-center gap-2 md:gap-3 ml-auto',
            searchOpen ? 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto' : '',
            'transition-opacity',
          ].join(' ')}
        >
          {/* صورة المستخدم */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="inline-grid place-items-center w-9 h-9 rounded-full ring-1 ring-black/5 hover:bg-gray-50 overflow-hidden"
                aria-expanded={userMenuOpen}
                aria-label="قائمة المستخدم"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName || 'الصورة الشخصية'}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="inline-grid place-items-center w-full h-full rounded-full bg-gray-900 text-white text-xs font-bold">
                    {avatarLetter}
                  </span>
                )}
              </button>

              {userMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white text-gray-900 rounded-xl shadow-xl ring-1 ring-black/5 z-[80] overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold truncate">{displayName || 'حسابي'}</p>
                    {displayEmail ? <p className="text-xs text-gray-500 mt-1 truncate">{displayEmail}</p> : null}
                    <p className="text-[11px] text-gray-400 mt-1">{isAdmin ? 'مشرف' : role === 'user' ? 'مستخدم' : '—'}</p>
                  </div>
                  {isAdmin && <Link href="/admin" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>لوحة التحكم</Link>}
                  <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>الملف الشخصي</Link>
                  <Link href="/orders" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>طلباتي</Link>
                  <hr className="border-gray-100" />
                  <button onClick={handleLogout} disabled={loggingOut} className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50 text-red-600 disabled:opacity-50">
                    {loggingOut ? 'جارٍ تسجيل الخروج…' : 'تسجيل الخروج'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-2 h-9 rounded-full ring-1 ring-black/5 px-3 hover:bg-gray-50"
              aria-label="تسجيل الدخول"
              title="تسجيل الدخول"
            >
              <FaUser className="text-gray-900" />
              <span className="hidden sm:inline text-sm text-gray-900">دخول</span>
            </Link>
          )}

          {/* المفضلة */}
          <Link
            href="/favorites"
            className="relative inline-grid place-items-center w-9 h-9 rounded-full ring-1 ring-black/5 hover:bg-gray-50"
            aria-label="المفضلة" title="المفضلة"
          >
            <HiHeart className="text-gray-900" size={18} />
            {totalFavorites > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 grid place-items-center">
                {totalFavorites}
              </span>
            )}
          </Link>

          {/* السلة */}
          <Link
            href="/cart"
            className="relative inline-grid place-items-center w-9 h-9 rounded-full ring-1 ring-black/5 hover:bg-gray-50"
            aria-label="عربة التسوق" title="عربة التسوق"
          >
            <FaShoppingCart className="text-gray-900" size={16} />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-extrabold rounded-full w-4.5 h-4.5 grid place-items-center">
                {totalCount}
              </span>
            )}
          </Link>

          {/* زر فتح البحث */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-grid place-items-center w-9 h-9 rounded-full ring-1 ring-black/5 bg-gray-100 hover:bg-gray-200"
            aria-label="بحث" title="بحث"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#111827" strokeWidth="2" />
              <path d="M20 20L17 17" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ===== شريط الإدخال داخل الكبسولة ===== */}
        <div ref={searchWrapRef} className="z-[70]">
          <div
            className={[
              'absolute top-1/2 -translate-y-1/2',
              'left-2 right-2 md:left-4 md:right-4',
              'transition-all duration-300',
              searchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
            ].join(' ')}
          >
            <div className="flex items-center rounded-full ring-1 ring-black/5 bg-gray-100 px-3 py-2">
              <input
                ref={searchInputRef}
                type="search"
                placeholder="ابحث عن هاتف أو ملحق…"
                className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-500"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={onSearchKeyDown}
              />
              <button
                type="button"
                className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200"
                onClick={() => {
                  setSearchOpen(false);
                  setResults([]);
                  setSearchText('');
                }}
                aria-label="إغلاق البحث"
                title="إغلاق"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ===== قائمة النتائج: أسفل الكبسولة ===== */}
        <div
          className={[
            'absolute left-2 right-2 md:left-4 md:right-4',
            'top-[calc(100%+8px)]',
            searchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
            'transition-opacity duration-200 z-[70]',
          ].join(' ')}
        >
          <div className="rounded-2xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden">
            {searchLoading && <div className="px-4 py-3 text-gray-900 text-sm">جاري البحث…</div>}

            {searchErr && !searchLoading && (
              <div className="px-4 py-3 text-red-600 text-sm">{searchErr}</div>
            )}

            {!searchLoading && !searchErr && results.length === 0 && searchText.trim().length >= 1 && (
              <div className="px-4 py-3 text-gray-900 text-sm">لا توجد نتائج مطابقة.</div>
            )}

            {results.length > 0 && (
              <ul className="max-h-[60vh] overflow-auto divide-y divide-gray-100">
                {results.map((p, idx) => {
                  const img = p.thumbnail_url || '/vercel.svg';
                  const ratingVal = typeof p.rating === 'number' ? Math.max(0, Math.min(5, p.rating)) : 0;
                  const fullStars = Math.floor(ratingVal);
                  const href = p.slug ? `/product/${p.slug}` : `/product/${p.id}`;

                  return (
                    <li
                      key={String(p.id)}
                      className={['hover:bg-gray-50 cursor-pointer', idx === activeIdx ? 'bg-gray-50' : ''].join(' ')}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => goToProduct(p)}
                      role="option"
                      aria-selected={idx === activeIdx}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden shrink-0">
                          <Image src={img} alt={p.name || ''} width={96} height={96} className="w-full h-full object-cover" unoptimized />
                        </div>
                        <div className="flex-1 min-w-0 text-gray-900">
                          <div className="font-bold truncate">{p.name || '—'}</div>
                          {p.brand_name && <div className="text-xs text-gray-500 truncate mt-0.5">{p.brand_name}</div>}
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            {typeof p.price === 'number' && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5">السعر: {p.price} ﷼</span>
                            )}
                            <span aria-label={`التقييم ${ratingVal}`}>
                              {'★'.repeat(fullStars)}
                              {'☆'.repeat(5 - fullStars)}
                            </span>
                          </div>
                        </div>
                        <Link
                          href={href}
                          className="text-xs text-primary underline shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchOpen(false);
                          }}
                        >
                          فتح
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* قائمة الجوال */}
        <div
          ref={mobileRef}
          className={[
            'absolute right-2 left-2 top-[calc(100%+8px)] md:hidden',
            'transition-all duration-200 z-[65]',
            mobileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none',
          ].join(' ')}
        >
          <div className="rounded-2xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden">
            <div className="flex flex-col divide-y divide-gray-100 text-gray-900">
              <Link href="/" className="px-4 py-3 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>الرئيسية</Link>
              <Link href="/phones" className="px-4 py-3 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>الهواتف</Link>
              <Link href="/accessories" className="px-4 py-3 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>الإكسسوارات</Link>
              <Link href="/brands" className="px-4 py-3 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>العلامات</Link>
              <Link href="/categories" className="px-4 py-3 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>التصنيفات</Link>
              <Link href="/about" className="px-4 py-3 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>من نحن</Link>
              <Link href="/shipping" className="px-4 py-3 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>الشحن والدفع</Link>
              <Link href="/contact" className="px-4 py-3 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>تواصل</Link>
              <Link href="/deals" className="px-4 py-3 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>عروض اليوم!</Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
