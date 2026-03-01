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

function TrackPageContent() {
  const searchParams = useSearchParams();
  const snFromUrl = searchParams.get("sn")?.trim();
  const [sn, setSn] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    receipt?: ReceiptData;
    attachments?: AttachmentItem[];
    workflow?: WorkflowData;
  } | null>(null);

  const doSearch = useCallback(async (serialNum: string) => {
    const trimmed = normalizeSnInput(serialNum);
    const normalized = trimmed.padStart(6, "0");
    if (normalized.length !== 6) {
      setResult({ found: false });
      return;
    }
    setLoading(true);
    setResult(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/track?sn=${encodeURIComponent(normalized)}`);
      const data = await res.json();
      setResult(data.found ? data : { found: false });
    } catch {
      setResult({ found: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (snFromUrl) {
      const normalized = normalizeSnInput(snFromUrl).padStart(6, "0");
      setSn(normalized);
      if (normalized.length === 6) {
        doSearch(normalized);
      }
    }
  }, [snFromUrl, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(sn);
  };

  const handleNewSearch = () => {
    setResult(null);
    setSearched(false);
    setSn("");
  };

  if (result?.found) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] pb-8" dir="rtl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#d4cfc8] bg-white/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={handleNewSearch}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            استعلام جديد
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
              backLabel="استعلام جديد"
              bannerText="متابعة مسيرة المعاملة"
              hidePrintButton={false}
            />
          </div>

          <div className="mt-4">
            <TransactionWorkflowChain transaction={result.workflow!} />
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
        <div className="mb-6 flex items-end gap-6">
          <Image src="/iraq.png" alt="شعار العراق" width={64} height={64} className="object-contain sm:w-20 sm:h-20" />
          <Image src="/sadiqoon.png" alt="كتلة الصادقون" width={64} height={64} className="object-contain sm:w-20 sm:h-20" />
        </div>
        <h1 className="text-xl font-bold text-[#1B1B1B] sm:text-2xl">متابعة المعاملة</h1>
        <p className="mt-2 text-center text-sm text-[#5a5a5a]">
          أدخل رقم المعاملة المكون من 6 أرقام للمتابعة
        </p>

        <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm">
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
          <button
            type="submit"
            disabled={loading || normalizeSnInput(sn).length !== 6}
            className="mt-4 w-full min-h-[48px] rounded-xl bg-[#1E6B3A] py-3.5 text-base font-medium text-white transition-colors hover:bg-[#175a2e] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {loading ? "جاري البحث…" : "استعلام"}
          </button>
        </form>

        {searched && result && !result.found && (
          <div className="mt-6 w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-center text-amber-800">
              لم يتم العثور على معاملة بهذا الرقم. تأكد من إدخال الرقم الصحيح.
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
