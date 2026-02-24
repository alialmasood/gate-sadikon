"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type TimelinePoint = { date: string; count: number };
type StatusPoint = { name: string; value: number; fill: string };

function formatDate(d: string) {
  return new Intl.DateTimeFormat("ar-IQ", { month: "short", day: "numeric", numberingSystem: "arab" }).format(new Date(d));
}

export default function AdminReportsPage() {
  const [period, setPeriod] = useState("months:30");
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [statusData, setStatusData] = useState<StatusPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [timelineRes, statusRes] = await Promise.all([
        fetch(`/api/admin/charts?chart=timeline&period=${period}`),
        fetch("/api/admin/charts?chart=status"),
      ]);
      if (timelineRes.ok) setTimelineData(await timelineRes.json());
      if (statusRes.ok) setStatusData(await statusRes.json());
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">التقارير</h1>
        <div className="flex gap-2">
          {[
            { value: "week", label: "أسبوع" },
            { value: "months:30", label: "شهر" },
            { value: "month", label: "الشهر الحالي" },
          ].map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                period === p.value ? "bg-[#1E6B3A] text-white" : "border border-[#d4cfc8] bg-white text-[#1B1B1B] hover:bg-[#f6f3ed]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1B1B1B]">رسم المعاملات حسب التاريخ</h2>
          <div className="mt-4 h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[#5a5a5a]">جاري التحميل…</div>
            ) : timelineData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[#5a5a5a]">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="reportGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#B08D57" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#B08D57" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number | undefined) => [v ?? 0, "معاملة"]}
                    labelFormatter={(l) => formatDate(l)}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #d4cfc8" }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#B08D57" strokeWidth={2} fill="url(#reportGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1B1B1B]">توزيع المعاملات حسب الحالة</h2>
          <div className="mt-4 flex h-72 items-center justify-center">
            {loading ? (
              <p className="text-[#5a5a5a]">جاري التحميل…</p>
            ) : statusData.length === 0 || statusData.every((s) => s.value === 0) ? (
              <p className="text-[#5a5a5a]">لا توجد معاملات</p>
            ) : (
              <PieChart width={320} height={280}>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="value">
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={statusData[i].fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number | undefined, _: string | undefined, p: { payload?: { name?: string } }) => [v ?? 0, p?.payload?.name ?? ""]} />
                <Legend />
              </PieChart>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
