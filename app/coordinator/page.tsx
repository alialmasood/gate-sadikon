"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type AdminDoneItem = {
  id: string;
  citizenName: string | null;
  transactionType: string | null;
  serialNumber: string | null;
  completedAt: string | null;
};

export default function CoordinatorDashboard() {
  const [adminDone, setAdminDone] = useState<AdminDoneItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/documentation/admin-done", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAdminDone((data || []).slice(0, 10));
      } else setAdminDone([]);
    } catch {
      setAdminDone([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    try {
      return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "short", numberingSystem: "arab" }).format(new Date(s));
    } catch {
      return s;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="border-b border-[#d4cfc8] pb-4">
        <h2 className="text-xl font-bold text-[#1B1B1B]">وحدة التنسيق والمتابعة</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">لوحة تحكم التنسيق والمتابعة</p>
      </div>

      {/* إشعار: معاملات منجزة من المدير */}
      {!loading && adminDone.length > 0 && (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
            <h2 className="text-base font-semibold text-[#1B1B1B]">إشعار — معاملات منجزة من المدير</h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">المعاملات التي أُنجزت مباشرة من قبل مدير المكتب</p>
          </div>
          <div className="p-6">
            <ul className="space-y-2">
              {adminDone.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d4cfc8] bg-[#f6f3ed]/30 px-4 py-3">
                  <span className="text-sm font-medium text-[#1B1B1B]">
                    {t.citizenName || "—"} — {t.transactionType || "—"} ({t.serialNumber || "—"})
                  </span>
                  <span className="text-xs text-[#5a5a5a]">تم الإنجاز: {formatDate(t.completedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      )}

      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white px-6 py-4 shadow-sm">
        <p className="text-sm text-[#5a5a5a]">
          المعاملات المحوّلة للمخولين تظهر في تبويب{" "}
          <Link href="/coordinator/delegates" className="font-medium text-[#1B1B1B] underline decoration-[#1E6B3A]/60 hover:decoration-[#1E6B3A]">
            متابعة المخولين
          </Link>{" "}
          — الحالة: لدى المخول.
        </p>
      </article>

      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
          <h2 className="text-base font-semibold text-[#1B1B1B]">تعليمات الاستخدام</h2>
        </div>
        <div className="p-8">
          <p className="text-center text-sm text-[#5a5a5a]">استخدم القائمة الجانبية للوصول إلى المعاملات العاجلة، متابعة المخولين، وغيرها.</p>
        </div>
      </article>
    </div>
  );
}
