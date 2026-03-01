"use client";

import Link from "next/link";

export default function AuthorizedAssignmentsPage() {
  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-[#1B1B1B] sm:text-2xl">التكليفات</h1>
        <p className="mt-1 text-sm text-[#5a5a5a]">المعاملات والصلاحيات المُعينة إليك</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/authorized/transactions"
          className="flex flex-col gap-3 rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm transition-all hover:border-[#5B7C99]/40 hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5B7C99]/10 text-[#5B7C99]">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </span>
          <div>
            <h2 className="font-semibold text-[#1B1B1B]">المعاملات المستلمة</h2>
            <p className="mt-1 text-sm text-[#5a5a5a]">عرض المعاملات المعينة إليك والبدء بالإجراءات</p>
          </div>
          <span className="mt-auto flex items-center gap-1 text-sm font-medium text-[#5B7C99]">
            عرض
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </span>
        </Link>

        <Link
          href="/authorized/transactions/completed"
          className="flex flex-col gap-3 rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm transition-all hover:border-[#1E6B3A]/40 hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1E6B3A]/10 text-[#1E6B3A]">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <h2 className="font-semibold text-[#1B1B1B]">المعاملات المنجزة</h2>
            <p className="mt-1 text-sm text-[#5a5a5a]">المعاملات التي أكملتها من التكليفات</p>
          </div>
          <span className="mt-auto flex items-center gap-1 text-sm font-medium text-[#1E6B3A]">
            عرض
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </span>
        </Link>
      </div>

      <div className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-[#1B1B1B]">حول التكليفات</h3>
        <p className="mt-2 text-sm text-[#5a5a5a] leading-relaxed">
          التكليفات هي المعاملات التي تُعيّن إليك من قبل قسم المتابعة أو مدير المكتب. يمكنك من خلال صفحة المعاملات المستلمة عرض التكليفات الجديدة والبدء بتنفيذ الإجراءات المطلوبة، ثم إكمال المعاملة عند الانتهاء.
        </p>
      </div>
    </div>
  );
}
