"use client";

import { useEffect, useState } from "react";

type OfficePoint = { id: string; name: string; type: string | null; points: number; rank: number };
type DelegatePoint = { id: string; name: string; officeName: string | null; points: number; rank: number };

export default function EvaluationPage() {
  const [offices, setOffices] = useState<OfficePoint[]>([]);
  const [delegates, setDelegates] = useState<DelegatePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/evaluation")
      .then((r) => (r.ok ? r.json() : { offices: [], delegates: [] }))
      .then((data) => {
        setOffices(data.offices ?? []);
        setDelegates(data.delegates ?? []);
      })
      .catch(() => {
        setOffices([]);
        setDelegates([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-[#1B1B1B]">التقييم</h1>

      {loading ? (
        <p className="py-8 text-center text-[#5a5a5a]">جاري التحميل…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* نقاط المكاتب + ترتيب */}
          <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#1B1B1B]">نقاط المكاتب والترتيب</h2>
            {offices.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#5a5a5a]">لا توجد مكاتب</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-right">
                  <thead>
                    <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                      <th className="py-3 pr-2">الترتيب</th>
                      <th className="py-3 pr-2">اسم المكتب</th>
                      <th className="py-3 pr-2">نوع المكتب</th>
                      <th className="py-3 pr-2">النقاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offices.map((o) => (
                      <tr key={o.id} className="border-b border-[#d4cfc8]/80 last:border-0">
                        <td className="py-3 pr-2">
                          <span
                            className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg text-sm font-bold ${
                              o.rank <= 3 ? "bg-[#1E6B3A]/15 text-[#1E6B3A]" : "bg-[#f6f3ed] text-[#5a5a5a]"
                            }`}
                          >
                            {o.rank}
                          </span>
                        </td>
                        <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{o.name || "—"}</td>
                        <td className="py-3 pr-2 text-[#5a5a5a]">{o.type || "—"}</td>
                        <td className="py-3 pr-2 font-semibold text-[#1E6B3A]">{o.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          {/* نقاط المخولين + ترتيب */}
          <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#1B1B1B]">نقاط المخولين والترتيب</h2>
            {delegates.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#5a5a5a]">لا يوجد مخولون</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-right">
                  <thead>
                    <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                      <th className="py-3 pr-2">الترتيب</th>
                      <th className="py-3 pr-2">اسم المخول</th>
                      <th className="py-3 pr-2">المكتب</th>
                      <th className="py-3 pr-2">النقاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delegates.map((d) => (
                      <tr key={d.id} className="border-b border-[#d4cfc8]/80 last:border-0">
                        <td className="py-3 pr-2">
                          <span
                            className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg text-sm font-bold ${
                              d.rank <= 3 ? "bg-[#1E6B3A]/15 text-[#1E6B3A]" : "bg-[#f6f3ed] text-[#5a5a5a]"
                            }`}
                          >
                            {d.rank}
                          </span>
                        </td>
                        <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{d.name || "—"}</td>
                        <td className="py-3 pr-2 text-[#5a5a5a]">{d.officeName || "—"}</td>
                        <td className="py-3 pr-2 font-semibold text-[#1E6B3A]">{d.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      )}

      <p className="text-sm text-[#5a5a5a]">
        النقاط تعتمد على عدد المعاملات (للمكاتب: إجمالي المعاملات، للمخولين: المعاملات المنجزة).
      </p>
    </div>
  );
}
