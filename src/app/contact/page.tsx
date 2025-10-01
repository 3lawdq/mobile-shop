// src/app/contact/page.tsx
'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@lib/supabaseClient';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (e: string) => !!e && /\S+@\S+\.\S+/.test(e);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !message.trim()) {
      toast.error('يرجى تعبئة الاسم والرسالة.');
      return;
    }
    if (email && !isValidEmail(email)) {
      toast.error('صيغة البريد الإلكتروني غير صحيحة.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabaseBrowser.from('contacts').insert({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        subject: subject.trim() || null,
        message: message.trim(),
      });

      if (error) {
        toast.error('حدث خطأ أثناء إرسال رسالتك.');
        return;
      }

      toast.success('✅ تم استلام رسالتك بنجاح. سنعود إليك قريبًا.');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch {
      toast.error('تعذر إرسال الرسالة، حاول لاحقًا.');
    } finally {
      setLoading(false);
    }
  };

  const waText = encodeURIComponent(
    `مرحبًا، لدي استفسار:
الاسم: ${name || '—'}
الهاتف: ${phone || '—'}
الموضوع: ${subject || '—'}
الرسالة: ${message || '—'}`
  );

  return (
    <div className="bg-white min-h-screen pt-24 px-6 text-gray-900 font-[Cairo]">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
        <h1 className="text-3xl font-bold mb-2 text-center text-primary">اتصل بنا</h1>
        <p className="text-center text-gray-600 mb-6">
          يسعدنا تواصلك. اكتب رسالتك وسنرد عليك في أقرب وقت.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">الاسم *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="اسمك الكامل"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="example@email.com"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">رقم الجوال</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="05xxxxxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">الموضوع</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="موضوع الرسالة (اختياري)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">الرسالة *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={6}
              placeholder="اكتب رسالتك هنا..."
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-5 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-60"
            >
              {loading ? 'جارٍ الإرسال...' : 'إرسال'}
            </button>

            <div className="flex flex-wrap gap-2 text-sm">
              <a
                href={`https://wa.me/966500000000?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-[#25D366] text-white hover:opacity-90"
              >
                مراسلتنا عبر واتساب
              </a>
              <a
                href="mailto:info@mobileshop.com"
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                مراسلة عبر البريد
              </a>
            </div>
          </div>
        </form>

        <hr className="my-6" />

        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold mb-1">الهاتف</p>
            <p className="text-gray-600">+966 50 000 0000</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold mb-1">البريد</p>
            <p className="text-gray-600">info@mobileshop.com</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold mb-1">العنوان</p>
            <p className="text-gray-600">تعز - اليمن</p>
          </div>
        </div>
      </div>
    </div>
  );
}
