// src/app/signup/SignupClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@lib/supabaseClient";

function safeInternal(target: string | null | undefined) {
  if (!target) return "/";
  if (target.startsWith("/")) return target;
  return "/";
}

export default function SignupClient() {
  const router = useRouter();
  const search = useSearchParams();

  const [nextParam, setNextParam] = useState("/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [checking, setChecking] = useState(true);
  const ranOnceRef = useRef(false);

  // قراءة بارامترات الـ URL بأمان
  useEffect(() => {
    const next = search.get("next") || search.get("redirect") || "/";
    setNextParam(safeInternal(next));
  }, [search]);

  // التحقق من حالة المستخدم مرة واحدة عند التحميل
  useEffect(() => {
    if (ranOnceRef.current) return;
    ranOnceRef.current = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          router.replace("/");
          return;
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setChecking(false);
      }
    })();
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.includes("@") || !email.includes(".")) {
      setError("صيغة البريد الإلكتروني غير صحيحة.");
      return;
    }

    if (password !== confirmPassword) {
      setError("❌ كلمتا المرور غير متطابقتين.");
      return;
    }

    if (password.length < 6) {
      setError("❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
            nextParam
          )}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const user = data.user;
      if (user) {
        // إنشاء بروفايل (يتوافق مع سياساتك/RLS)
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            user_id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || "",
            avatar_url: user.user_metadata?.avatar_url || "",
          },
        ]);

        if (profileError) {
          console.error("Profile insert error:", profileError);
          setError("حدث خطأ أثناء إنشاء الملف الشخصي للمستخدم. حاول مرة أخرى.");
          return;
        }

        router.push(
          "/login?message=" +
            encodeURIComponent("تم إنشاء الحساب بنجاح. تحقق من بريدك الإلكتروني.")
        );
      }
    } catch (e: unknown) {
      console.error("Signup failed:", e);
      setError(
        e instanceof Error ? e.message : "حدث خطأ غير متوقع أثناء محاولة التسجيل."
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 font-[Cairo] py-8">
      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm w-full max-w-md">
        <h2 className="text-2xl font-extrabold mb-6 text-center">إنشاء حساب جديد</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 font-medium">البريد الإلكتروني</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium">كلمة المرور</label>
            <input
              type="password"
              placeholder="6 أحرف على الأقل"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium">تأكيد كلمة المرور</label>
            <input
              type="password"
              placeholder="أعد إدخال كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            تسجيل الدخول
          </Link>
        </p>

        <p className="text-center mt-3 text-xs text-gray-500">
          بمتابعة التسجيل، فإنك توافق على{" "}
          <Link href="/terms" className="text-primary hover:underline">
            الشروط والأحكام
          </Link>{" "}
          و{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            سياسة الخصوصية
          </Link>
        </p>
      </div>
    </div>
  );
}
