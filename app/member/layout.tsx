"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "arab",
  }).format(date);
}

const NAV_ITEMS = [{ href: "/member", label: "لوحة التحكم", icon: "dashboard" }];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#f0f4f8] pb-[env(safe-area-inset-bottom)]" dir="rtl">
      {/* الشريط الجانبي */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex h-screen shrink-0 flex-col overflow-hidden border-l border-[#d4cfc8] bg-white shadow-lg transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } w-[min(256px,85vw)] lg:w-64`}
      >
        <div className="flex h-16 min-h-[44px] items-center justify-between gap-2 border-b border-[#d4cfc8] bg-[#1e3a5f] px-3 pt-[env(safe-area-inset-top)]">
          <Link href="/member" className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
              <img src="/gatmark.png" alt="عضو مجلس النواب" className="h-full w-full object-contain" />
            </span>
            <span className="truncate text-[15px] font-bold text-white">عضو مجلس النواب</span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[#1e3a5f]/10 text-[#1e3a5f]"
                    : "text-[#1B1B1B] hover:bg-[#f6f3ed] hover:text-[#1e3a5f]"
                }`}
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                </svg>
                <span className="flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#d4cfc8] p-3">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-[#5a5a5a] transition-all duration-200 hover:bg-[#f6f3ed] hover:text-[#1e3a5f]"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>العودة للمنصة الرئيسية</span>
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="إغلاق"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 min-h-[44px] shrink-0 items-center justify-between gap-2 border-b border-[#d4cfc8] bg-white/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur sm:gap-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#5a5a5a] hover:bg-[#f6f3ed] active:bg-[#ebe7e0] lg:hidden"
            aria-label="فتح القائمة"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <Link
                href="/member"
                className="flex shrink-0 items-center rounded-lg px-2 py-2.5 transition-colors hover:bg-[#f6f3ed] active:bg-[#ebe7e0]"
              >
                <span className="truncate text-sm font-bold text-[#1e3a5f] sm:text-base">بوابة الصادقون — عضو مجلس النواب</span>
              </Link>
              <span className="hidden h-5 w-px shrink-0 bg-[#d4cfc8] sm:block" aria-hidden />
              <h1 className="hidden truncate text-lg font-bold text-[#1B1B1B] sm:block sm:text-xl">لوحة التحكم</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <p className="hidden truncate text-sm text-[#5a5a5a] min-[400px]:block" suppressHydrationWarning>
                {formatDateTime(time)}
              </p>
              <div className="hidden h-4 w-px shrink-0 bg-[#d4cfc8] sm:block" aria-hidden />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex h-10 min-w-[44px] items-center justify-center gap-2 rounded-lg border border-[#d4cfc8] bg-white px-3 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed] active:bg-[#ebe7e0]"
              >
                <span className="hidden sm:inline">تسجيل الخروج</span>
                <svg className="h-5 w-5 shrink-0 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>
        <main className="relative flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
