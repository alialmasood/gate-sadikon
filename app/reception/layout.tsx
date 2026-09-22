"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { safeSignOut } from "@/lib/client-safe-signout";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "arab",
  }).format(date);
}

function getBreadcrumb(pathname: string): string[] {
  const map: Record<string, string> = {
    "/reception": "لوحة التحكم",
    "/reception/citizens": "شؤون المواطنين",
    "/reception/transactions": "المعاملات",
    "/reception/reports": "تقارير وإحصائيات",
  };
  if (pathname in map) return ["استقبال واستعلامات", map[pathname]];
  return ["استقبال واستعلامات", "لوحة التحكم"];
}

const NAV_ITEMS = [
  { href: "/reception", label: "لوحة التحكم" },
  { href: "/reception/citizens", label: "شؤون المواطنين" },
  { href: "/reception/transactions", label: "المعاملات" },
  { href: "/reception/reports", label: "تقارير وإحصائيات" },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/reception": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  "/reception/citizens": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  "/reception/transactions": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  "/reception/reports": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

const SIDEBAR_COLLAPSED_KEY = "reception-sidebar-collapsed";

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [time, setTime] = useState(() => new Date());
  const breadcrumb = useMemo(() => getBreadcrumb(pathname), [pathname]);
  const accountTitle = session?.user?.department?.trim() || session?.user?.name?.trim() || "الحساب";

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
    <div className="flex min-h-dvh bg-[#F6F8FB]" dir="rtl">
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-l border-[#E6EAF0] bg-white transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } ${sidebarCollapsed ? "w-[72px]" : "w-64"}`}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-3">
          {!sidebarCollapsed ? (
            <Link href="/reception" className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F6F8FB]">
                <img src="/gatmark.png" alt="استقبال واستعلامات" className="h-full w-full object-contain" />
              </span>
              <span className="font-heading truncate text-[15px] font-semibold text-[#101828]">استقبال واستعلامات</span>
            </Link>
          ) : (
            <Link href="/reception" title="لوحة التحكم" className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F6F8FB]">
              <img src="/gatmark.png" alt="استقبال واستعلامات" className="h-full w-full object-contain" />
            </Link>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden rounded-xl p-2 text-[#667085] hover:bg-[#F6F8FB] lg:flex"
              aria-label={sidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}
              title={sidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}
            >
              <svg className={`h-5 w-5 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-xl p-2 text-[#667085] hover:bg-[#F6F8FB] lg:hidden" aria-label="إغلاق القائمة">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/reception" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-200 ${
                  isActive ? "bg-[#1e3a5f] text-white" : "text-[#344054] hover:bg-[#F6F8FB] hover:text-[#1e3a5f]"
                }`}
              >
                {isActive && sidebarCollapsed && (
                  <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white" aria-hidden />
                )}
                <span className={isActive ? "text-white" : "text-[#98A2B3] group-hover:text-[#1e3a5f]"}>
                  {NAV_ICONS[item.href]}
                </span>
                {!sidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-3">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            title={sidebarCollapsed ? "العودة للمنصة الرئيسية" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#667085] transition-colors duration-200 hover:bg-[#F6F8FB] hover:text-[#1e3a5f] ${sidebarCollapsed ? "justify-center" : ""}`}
          >
            <svg className="h-5 w-5 shrink-0 text-[#98A2B3] group-hover:text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <header className="sticky top-0 z-20 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#E6EAF0] bg-white/90 px-3 py-2 backdrop-blur-md sm:gap-4 sm:px-6">
          <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 text-[#667085] hover:bg-[#F6F8FB] lg:hidden" aria-label="فتح القائمة">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-[#F6F8FB]"
                title="العودة للصفحة الرئيسية"
              >
                <span className="font-display text-base font-semibold text-[#1e3a5f] sm:text-lg">بوابة الصادقون</span>
              </Link>
              <span className="hidden h-5 w-px bg-[#E6EAF0] sm:block" aria-hidden />
              <div className="hidden items-center gap-2 text-sm text-[#667085] sm:flex">
                <Link href="/reception" className="hover:text-[#1e3a5f]">{breadcrumb[0]}</Link>
                <span className="text-[#D0D5DD]">/</span>
                <span className="font-medium text-[#101828]">{breadcrumb[1]}</span>
              </div>
              <h1 className="truncate text-base font-semibold text-[#101828] sm:hidden">{breadcrumb[1]}</h1>
            </div>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="hidden max-w-[10rem] truncate text-sm font-medium text-[#1e3a5f] sm:inline">{accountTitle}</span>
              <p className="max-w-[9.5rem] truncate text-[11px] tabular-nums text-[#667085] sm:max-w-none sm:text-sm" suppressHydrationWarning>
                {formatDateTime(time)}
              </p>
              <div className="h-4 w-px bg-[#E6EAF0]" />
              <button type="button" onClick={() => void safeSignOut()} className="flex items-center gap-2 rounded-xl bg-[#F6F8FB] px-2.5 py-2 text-sm font-medium text-[#101828] hover:bg-[#EEF2F6] sm:px-3">
                <span className="hidden sm:inline">تسجيل الخروج</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>
        <main className="relative min-w-0 flex-1 p-3 sm:p-6 lg:p-8">{children}</main>
      </div>

        <Link
          href="/reception/citizens/new"
          className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e3a5f] text-white shadow-[0_8px_24px_rgba(30,58,95,0.28)] transition-transform hover:scale-105 hover:bg-[#152d47] active:scale-95"
          aria-label="معاملة جديدة"
          title="معاملة جديدة"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </Link>
    </div>
  );
}
