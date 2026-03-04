"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";
import { TransactionWorkflowChain } from "@/components/TransactionWorkflowChain";

type AttachmentItem = { url: string; name?: string };
type WorkflowData = {
  status?: string;
  urgent?: boolean;
  cannotComplete?: boolean;
  cannotCompleteReason?: string | null;
  delegateName?: string | null;
  reachedSorting?: boolean;
  completedByAdmin?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  delegateActions?: { text: string; attachmentUrl?: string; attachmentName?: string; createdAt: string }[];
};

function normalizeSnInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length > 6) return digits.slice(0, 6);
  return digits;
}

function normalizePhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length > 11) return digits.slice(0, 11);
  return digits;
}

const TRACK_SESSION_KEY = "track-session";

function loadTrackSession(): { sn: string; phone: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TRACK_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { sn?: string; phone?: string };
    const sn = normalizeSnInput(data.sn || "").padStart(6, "0");
    const phone = normalizePhoneInput(data.phone || "");
    if (sn.length === 6 && phone.length >= 10) return { sn, phone };
  } catch {}
  return null;
}

function saveTrackSession(sn: string, phone: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TRACK_SESSION_KEY, JSON.stringify({ sn, phone }));
  } catch {}
}

function clearTrackSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TRACK_SESSION_KEY);
  } catch {}
}

function TrackPageContent() {
  const searchParams = useSearchParams();
  const snFromUrl = searchParams.get("sn")?.trim();
  const [sn, setSn] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    receipt?: ReceiptData;
    attachments?: AttachmentItem[];
    workflow?: WorkflowData;
  } | null>(null);

  const doSearch = useCallback(async (serialNum: string, phoneNum: string) => {
    const trimmed = normalizeSnInput(serialNum);
    const normalized = trimmed.padStart(6, "0");
    const phoneDigits = normalizePhoneInput(phoneNum);
    if (normalized.length !== 6) {
      setResult({ found: false });
      return;
    }
    if (phoneDigits.length < 10) {
      setResult({ found: false });
      return;
    }
    setLoading(true);
    setResult(null);
    setSearched(true);
    try {
      const params = new URLSearchParams({ sn: normalized, phone: phoneDigits });
      const res = await fetch(`/api/track?${params.toString()}`);
      const data = await res.json();
      if (data.found) {
        setResult(data);
        saveTrackSession(normalized, phoneDigits);
      } else {
        setResult({ found: false });
      }
    } catch {
      setResult({ found: false });
    } finally {
      setLoading(false);
    }
  }, []);

  // استعادة الجلسة من sessionStorage أو من الرابط — عند إعادة التحميل نبقى على نفس المعاملة
  useEffect(() => {
    const session = loadTrackSession();
    if (session) {
      setSn(session.sn);
      setPhone(session.phone);
      doSearch(session.sn, session.phone);
      return;
    }
    if (snFromUrl) {
      const normalized = normalizeSnInput(snFromUrl).padStart(6, "0");
      setSn(normalized);
    }
  }, [snFromUrl, doSearch]);

  // تحديث تلقائي للمعاملات عند عرض النتيجة — كل 25 ثانية
  useEffect(() => {
    if (!result?.found || !result.receipt?.serialNumber) return;
    const normalized = result.receipt.serialNumber;
    const phoneDigits = normalizePhoneInput(phone);
    if (phoneDigits.length < 10) return;

    const refresh = async () => {
      try {
        const params = new URLSearchParams({ sn: normalized, phone: phoneDigits });
        const res = await fetch(`/api/track?${params.toString()}`);
        const data = await res.json();
        if (data.found) setResult(data);
        // عند فشل التحديث أو عدم العثور: لا نحدّث — نبقي المستخدم في العرض الحالي (لا تسجيل خروج تلقائي)
      } catch { /* تجاهل خطأ التحديث */ }
    };

    const interval = setInterval(refresh, 25_000);
    return () => clearInterval(interval);
  }, [result?.found, result?.receipt?.serialNumber, phone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(sn, phone);
  };

  const handleNewSearch = () => {
    clearTrackSession();
    setResult(null);
    setSearched(false);
    setSn("");
    setPhone("");
  };

  if (result?.found) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] pb-8" dir="rtl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#d4cfc8] bg-white/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={handleNewSearch}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#c9d6e3] bg-[#f0f4f8] px-4 py-2.5 text-sm font-medium text-[#1e3a5f] hover:bg-[#e5ecf3]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            تسجيل الخروج
          </button>
          <span className="font-mono text-sm font-bold text-[#1E6B3A]" dir="ltr">
            {result.receipt?.serialNumber ? `2026-${result.receipt.serialNumber}` : "—"}
          </span>
        </div>

        <main className="mx-auto max-w-lg px-4 py-6">
          <div className="rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-6">
            <TransactionReceipt
              receipt={result.receipt!}
              mode="standalone"
              showStandaloneNav={false}
              backHref="#"
              backLabel="تسجيل الخروج"
              bannerText="متابعة مسيرة المعاملة"
              hidePrintButton={false}
            />
          </div>

          <div className="mt-4">
            <TransactionWorkflowChain transaction={result.workflow!} hideDelegateName />
          </div>

          {result.attachments && result.attachments.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-[#1B1B1B]">المرفقات</h3>
              <ul className="space-y-3">
                {result.attachments.map((att, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#d4cfc8] bg-[#f8fafc] p-3"
                  >
                    <span className="truncate text-sm text-[#1B1B1B]">
                      {att.name || `مرفق ${i + 1}`}
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-[#1E6B3A] px-3 py-1.5 text-xs font-medium text-white"
                      >
                        عرض
                      </a>
                      <a
                        href={att.url}
                        download={att.name || `attachment-${i + 1}`}
                        className="rounded-lg border border-[#1E6B3A] px-3 py-1.5 text-xs font-medium text-[#1E6B3A]"
                      >
                        تحميل
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9] px-4 py-6 sm:py-12" dir="rtl">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center">
        <div className="mb-6 flex items-center gap-6">
          <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
            <Image src="/iraq.png" alt="شعار العراق" fill className="object-contain object-center" sizes="80px" />
          </div>
          <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
            <Image src="/sadiqoon.png" alt="كتلة الصادقون" fill className="object-contain object-center" sizes="80px" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-[#1B1B1B] sm:text-2xl">متابعة المعاملة</h1>
        <p className="mt-2 text-center text-sm text-[#5a5a5a]">
          أدخل رقم المعاملة ورقم هاتفك المسجل للمتابعة
        </p>

        <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm space-y-4">
          <div>
            <label className="mb-1 block text-right text-sm font-medium text-[#5a5a5a]">رقم المعاملة (6 أرقام)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={sn}
              onChange={(e) => setSn(normalizeSnInput(e.target.value))}
              placeholder="000001"
              className="w-full rounded-xl border-2 border-[#d4cfc8] bg-white px-4 py-4 text-center text-2xl font-bold tracking-[0.3em] text-[#1B1B1B] focus:border-[#1E6B3A] focus:outline-none focus:ring-2 focus:ring-[#1E6B3A]/20 sm:py-5"
              dir="ltr"
              autoFocus={!snFromUrl}
            />
          </div>
          <div>
            <label className="mb-1 block text-right text-sm font-medium text-[#5a5a5a]">رقم هاتف المواطن</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
              placeholder="07XXXXXXXXX"
              className="w-full rounded-xl border-2 border-[#d4cfc8] bg-white px-4 py-4 text-center text-lg font-medium text-[#1B1B1B] focus:border-[#1E6B3A] focus:outline-none focus:ring-2 focus:ring-[#1E6B3A]/20 sm:py-5"
              dir="ltr"
              autoFocus={!!snFromUrl}
            />
          </div>
          <button
            type="submit"
            disabled={loading || normalizeSnInput(sn).length !== 6 || normalizePhoneInput(phone).length < 10}
            className="mt-4 w-full min-h-[48px] rounded-xl bg-[#1E6B3A] py-3.5 text-base font-medium text-white transition-colors hover:bg-[#175a2e] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {loading ? "جاري البحث…" : "استعلام"}
          </button>
        </form>

        {searched && result && !result.found && (
          <div className="mt-6 w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-center text-amber-800">
              لم يتم العثور على معاملة. تأكد من صحة رقم المعاملة ورقم الهاتف المسجل في الاستمارة.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

function TrackLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]" dir="rtl">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#1E6B3A] border-t-transparent" />
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<TrackLoading />}>
      <TrackPageContent />
    </Suspense>
  );
}
