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

const SIDEBAR_COLLAPSED_KEY = "authorized-sidebar-collapsed";

const NAV_ITEMS = [
  { href: "/authorized", label: "لوحة التحكم", icon: "dashboard" },
  { href: "/authorized/transactions", label: "المعاملات المستلمة", icon: "transactions" },
  { href: "/authorized/assignments", label: "التكليفات", icon: "assignments" },
  { href: "/authorized/transactions/completed", label: "المعاملات المنجزة", icon: "completed" },
  { href: "/authorized/reports", label: "إحصائيات وتقارير", icon: "reports" },
];

export default function AuthorizedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) setSidebarCollapsed(stored === "true");
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#FAFAF9] pb-[env(safe-area-inset-bottom)]" dir="rtl">
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex h-screen shrink-0 flex-col overflow-hidden border-l border-[#d4cfc8] bg-white shadow-lg transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } w-[min(256px,85vw)] ${sidebarCollapsed ? "lg:w-[72px]" : "lg:w-64"}`}
      >
        <div className="flex h-16 min-h-[44px] items-center justify-between gap-2 border-b border-[#d4cfc8] px-3 pt-[env(safe-area-inset-top)]">
          {!sidebarCollapsed ? (
            <Link href="/authorized" className="flex min-w-0 flex-1 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img src="/gatmark.png" alt="المخولين" className="h-full w-full object-contain" />
              </span>
              <span className="truncate text-[15px] font-bold text-[#1B1B1B]">المخولين</span>
            </Link>
          ) : (
            <Link href="/authorized" title="لوحة التحكم" className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
              <img src="/gatmark.png" alt="المخولين" className="h-full w-full object-contain" />
            </Link>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden rounded p-2 text-[#5a5a5a] hover:bg-[#f6f3ed] lg:flex"
              aria-label={sidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}
            >
              <svg className={`h-5 w-5 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button type="button" onClick={() => setSidebarOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#5a5a5a] hover:bg-[#f6f3ed] active:bg-[#ebe7e0] lg:hidden" aria-label="إغلاق القائمة">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/authorized"
                ? pathname === "/authorized"
                : item.href === "/authorized/transactions/completed"
                  ? pathname.startsWith("/authorized/transactions/completed")
                  : item.href === "/authorized/reports"
                    ? pathname.startsWith("/authorized/reports")
                    : item.href === "/authorized/assignments"
                      ? pathname.startsWith("/authorized/assignments")
                      : pathname.startsWith("/authorized/transactions") && !pathname.startsWith("/authorized/transactions/completed");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all duration-200 ${
                  isActive ? "bg-[#e8f0eb] text-[#1E6B3A]" : "text-[#1B1B1B] hover:bg-[#f6f3ed] hover:text-[#1E6B3A]"
                }`}
              >
                {item.icon === "dashboard" ? (
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                  </svg>
                ) : item.icon === "completed" ? (
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : item.icon === "reports" ? (
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ) : item.icon === "assignments" ? (
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                )}
                {!sidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#d4cfc8] p-3">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            title={sidebarCollapsed ? "العودة للمنصة الرئيسية" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-[#5a5a5a] transition-all duration-200 hover:bg-[#f6f3ed] hover:text-[#1E6B3A] ${sidebarCollapsed ? "justify-center" : ""}`}
          >
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {!sidebarCollapsed && <span>العودة للمنصة الرئيسية</span>}
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <button type="button" aria-label="إغلاق" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 min-h-[44px] shrink-0 items-center justify-between gap-2 border-b border-[#d4cfc8] bg-white/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur sm:gap-4 sm:px-6">
          <button type="button" onClick={() => setSidebarOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#5a5a5a] hover:bg-[#f6f3ed] active:bg-[#ebe7e0] lg:hidden" aria-label="فتح القائمة">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="flex shrink-0 items-center rounded-lg px-2 py-2.5 transition-colors hover:bg-[#f6f3ed] active:bg-[#ebe7e0]"
                title="العودة للصفحة الرئيسية"
              >
                <span className="truncate text-sm font-bold text-[#1E6B3A] sm:text-base sm:text-lg">بوابة الصادقون</span>
              </Link>
              <span className="hidden h-5 w-px shrink-0 bg-[#d4cfc8] sm:block" aria-hidden />
              <h1 className="hidden truncate text-lg font-bold text-[#1B1B1B] sm:block sm:text-xl">لوحة التحكم</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <p className="hidden truncate text-sm text-[#5a5a5a] min-[400px]:block" suppressHydrationWarning>
                {formatDateTime(time)}
              </p>
              <div className="hidden h-4 w-px shrink-0 bg-[#d4cfc8] sm:block" aria-hidden />
              <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="flex h-10 min-w-[44px] items-center justify-center gap-2 rounded-lg border border-[#d4cfc8] bg-white px-3 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed] active:bg-[#ebe7e0]">
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
