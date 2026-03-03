"use client";

import { useState, useMemo, useEffect } from "react";
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

function getBreadcrumb(pathname: string): string[] {
  const map: Record<string, string> = {
    "/supervisor": "لوحة التحكم",
    "/supervisor/offices": "عرض المكاتب",
  };
  if (pathname in map) return ["الإشراف والمراقبة", map[pathname]];
  if (pathname.match(/^\/supervisor\/offices\/[^/]+$/)) return ["الإشراف والمراقبة", "تفاصيل المكتب"];
  if (pathname.startsWith("/supervisor/")) return ["الإشراف والمراقبة", "عرض المكاتب"];
  return ["الإشراف والمراقبة", "لوحة التحكم"];
}

const NAV_ITEMS = [
  { href: "/supervisor", label: "لوحة التحكم" },
  { href: "/supervisor/offices", label: "عرض المكاتب" },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/supervisor": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  "/supervisor/offices": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

const SIDEBAR_COLLAPSED_KEY = "supervisor-sidebar-collapsed";

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [time, setTime] = useState(() => new Date());
  const breadcrumb = useMemo(() => getBreadcrumb(pathname), [pathname]);

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
    <div className="flex min-h-screen bg-[#FAFAF9]" dir="rtl">
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex h-screen shrink-0 flex-col overflow-hidden border-l border-[#d4cfc8] bg-white shadow-lg transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 print:hidden ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } ${sidebarCollapsed ? "w-[72px]" : "w-64"}`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-[#d4cfc8] px-3">
          {!sidebarCollapsed ? (
            <Link href="/supervisor" className="flex min-w-0 flex-1 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img src="/gatmark.png" alt="الإشراف والمراقبة" className="h-full w-full object-contain" />
              </span>
              <span className="truncate text-[15px] font-bold text-[#1B1B1B]">الإشراف والمراقبة</span>
            </Link>
          ) : (
            <Link href="/supervisor" title="لوحة التحكم" className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
              <img src="/gatmark.png" alt="الإشراف والمراقبة" className="h-full w-full object-contain" />
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
            <button type="button" onClick={() => setSidebarOpen(false)} className="rounded p-2 text-[#5a5a5a] hover:bg-[#f6f3ed] lg:hidden" aria-label="إغلاق القائمة">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/supervisor" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all duration-200 ${
                  isActive ? "bg-[#e8f5ec] text-[#1E6B3A]" : "text-[#1B1B1B] hover:bg-[#f6f3ed] hover:text-[#1E6B3A]"
                }`}
              >
                {isActive && (
                  <>
                    <span className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-[#B08D57] shadow-sm" aria-hidden />
                    {sidebarCollapsed && <span className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#1E6B3A] ring-2 ring-white" aria-hidden />}
                  </>
                )}
                <span className={isActive ? "text-[#1E6B3A]" : "text-[#5a5a5a] group-hover:text-[#1E6B3A]"}>
                  {NAV_ICONS[item.href]}
                </span>
                {!sidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#d4cfc8] p-3">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-[#5a5a5a] transition-all duration-200 hover:bg-[#f6f3ed] hover:text-red-600 ${sidebarCollapsed ? "justify-center" : ""}`}
          >
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button type="button" aria-label="إغلاق" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#d4cfc8] bg-white/95 px-4 backdrop-blur sm:px-6 print:hidden"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-[#5a5a5a] hover:bg-[#f6f3ed] lg:hidden" aria-label="فتح القائمة">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex flex-1 flex-row flex-wrap items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 text-sm text-[#5a5a5a] sm:flex">
                <Link href="/supervisor" className="hover:text-[#1E6B3A]">{breadcrumb[0]}</Link>
                <span>/</span>
                <span className="font-medium text-[#1B1B1B]">{breadcrumb[1]}</span>
              </div>
              <h1 className="min-w-0 flex-1 truncate text-base font-bold text-[#1B1B1B] sm:text-lg sm:text-xl">{breadcrumb[1]}</h1>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <p className="text-sm text-[#5a5a5a]" suppressHydrationWarning>
                {formatDateTime(time)}
              </p>
              <div className="hidden h-4 w-px bg-[#d4cfc8] lg:block" />
              <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="hidden items-center gap-2 rounded-lg border border-[#d4cfc8] bg-white px-3 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed] lg:flex">
                <span className="hidden sm:inline">تسجيل الخروج</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>
        <main className="relative flex-1 p-4 sm:p-6 max-sm:pt-8">{children}</main>
      </div>
    </div>
  );
}
