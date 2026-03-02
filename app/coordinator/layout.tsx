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
    "/coordinator": "لوحة التحكم",
    "/coordinator/incoming": "المعاملات الواردة",
    "/coordinator/urgent": "المعاملات العاجلة",
    "/coordinator/completed": "المعاملات المنجزة",
    "/coordinator/follow-up": "متابعة المعاملات",
    "/coordinator/cannot-complete": "المعاملات تعذر انجازها",
    "/coordinator/delegates": "متابعة المخولين",
  };
  if (pathname in map) return ["تنسيق ومتابعة", map[pathname]];
  return ["تنسيق ومتابعة", "لوحة التحكم"];
}

const NAV_ITEMS = [
  { href: "/coordinator", label: "لوحة التحكم" },
  { href: "/coordinator/incoming", label: "المعاملات الواردة" },
  { href: "/coordinator/urgent", label: "المعاملات العاجلة" },
  { href: "/coordinator/completed", label: "المعاملات المنجزة" },
  { href: "/coordinator/cannot-complete", label: "المعاملات تعذر انجازها" },
  { href: "/coordinator/follow-up", label: "متابعة المعاملات" },
  { href: "/coordinator/delegates", label: "متابعة المخولين" },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/coordinator": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  "/coordinator/incoming": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  "/coordinator/urgent": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  "/coordinator/completed": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  "/coordinator/follow-up": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  "/coordinator/cannot-complete": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  "/coordinator/delegates": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const SIDEBAR_COLLAPSED_KEY = "coordinator-sidebar-collapsed";

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
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
        className={`fixed inset-y-0 right-0 z-40 flex h-screen shrink-0 flex-col overflow-hidden border-l border-[#d4cfc8] bg-white shadow-lg transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } ${sidebarCollapsed ? "w-[72px]" : "w-64"}`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-[#d4cfc8] px-3">
          {!sidebarCollapsed ? (
            <Link href="/coordinator" className="flex min-w-0 flex-1 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img src="/gatmark.png" alt="تنسيق ومتابعة" className="h-full w-full object-contain" />
              </span>
              <span className="truncate text-[15px] font-bold text-[#1B1B1B]">تنسيق ومتابعة</span>
            </Link>
          ) : (
            <Link href="/coordinator" title="لوحة التحكم" className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
              <img src="/gatmark.png" alt="تنسيق ومتابعة" className="h-full w-full object-contain" />
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
            const isActive = pathname === item.href || (item.href !== "/coordinator" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all duration-200 ${
                  isActive ? "bg-[#e8f0eb] text-[#1E6B3A]" : "text-[#1B1B1B] hover:bg-[#f6f3ed] hover:text-[#5B7C99]"
                }`}
              >
                {isActive && (
                  <>
                    <span className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-[#5B7C99] shadow-sm" aria-hidden />
                    {sidebarCollapsed && <span className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#1E6B3A] ring-2 ring-white" aria-hidden />}
                  </>
                )}
                <span className={isActive ? "text-[#5B7C99]" : "text-[#5a5a5a] group-hover:text-[#5B7C99]"}>
                  {NAV_ICONS[item.href] ?? NAV_ICONS["/coordinator"]}
                </span>
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
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-[#5a5a5a] transition-all duration-200 hover:bg-[#f6f3ed] hover:text-[#5B7C99] ${sidebarCollapsed ? "justify-center" : ""}`}
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
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#d4cfc8] bg-white/95 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-[#5a5a5a] hover:bg-[#f6f3ed] lg:hidden" aria-label="فتح القائمة">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex flex-1 flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 text-sm text-[#5a5a5a] sm:flex">
                <Link href="/coordinator" className="hover:text-[#5B7C99]">{breadcrumb[0]}</Link>
                <span>/</span>
                <span className="font-medium text-[#1B1B1B]">{breadcrumb[1]}</span>
              </div>
              <h1 className="text-lg font-bold text-[#1B1B1B] sm:text-xl">{breadcrumb[1]}</h1>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-[#5a5a5a]" suppressHydrationWarning>
                {formatDateTime(time)}
              </p>
              <div className="h-4 w-px bg-[#d4cfc8]" />
              <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-2 rounded-lg border border-[#d4cfc8] bg-white px-3 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]">
                <span className="hidden sm:inline">تسجيل الخروج</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
