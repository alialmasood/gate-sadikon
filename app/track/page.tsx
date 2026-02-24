"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function TrackPage() {
  const [sn, setSn] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    status?: string;
    officeName?: string;
    citizenName?: string;
    submissionDate?: string;
  } | null>(null);

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "قيد التنفيذ",
    DONE: "منجزة",
    OVERDUE: "متأخرة",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = sn.trim().replace(/\D/g, "").slice(0, 6);
    if (trimmed.length !== 6) {
      setResult({ found: false });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/track?sn=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setResult(data.found ? data : { found: false });
    } catch {
      setResult({ found: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="flex items-end gap-8 mb-8">
        <Image src="/iraq.png" alt="شعار العراق" width={80} height={80} className="object-contain" />
        <Image src="/sadiqoon.png" alt="كتلة الصادقون" width={80} height={80} className="object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-[#1B1B1B]">متابعة المعاملة</h1>
      <p className="mt-2 text-[#5a5a5a]">أدخل رقم المعاملة المكون من 6 أرقام</p>

      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={sn}
          onChange={(e) => setSn(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="XXXXXX"
          className="w-full rounded-xl border border-[#d4cfc8] bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={loading || sn.replace(/\D/g, "").length !== 6}
          className="mt-4 w-full rounded-xl bg-[#1E6B3A] py-3 font-medium text-white hover:bg-[#175a2e] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "جاري البحث…" : "استعلام"}
        </button>
      </form>

      {result && (
        <div className={`mt-8 w-full max-w-sm rounded-2xl border p-6 ${result.found ? "border-[#1E6B3A]/50 bg-[#1E6B3A]/5" : "border-amber-200 bg-amber-50"}`}>
          {result.found ? (
            <>
              <p className="font-semibold text-[#1E6B3A]">تم العثور على المعاملة</p>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="text-[#5a5a5a]">الحالة: </span><span className="font-medium">{STATUS_LABELS[result.status || ""] || result.status}</span></p>
                {result.officeName && <p><span className="text-[#5a5a5a]">المكتب: </span>{result.officeName}</p>}
                {result.submissionDate && <p><span className="text-[#5a5a5a]">تاريخ التقديم: </span>{new Date(result.submissionDate).toLocaleDateString("ar-IQ")}</p>}
              </div>
            </>
          ) : (
            <p className="text-amber-800">لم يتم العثور على معاملة بهذا الرقم. تأكد من إدخال الرقم الصحيح.</p>
          )}
        </div>
      )}

      <Link href="/" className="mt-8 text-sm text-[#B08D57] hover:underline">
        العودة للرئيسية
      </Link>
    </div>
  );
}
