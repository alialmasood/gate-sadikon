"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    "/super-admin": "لوحة التحكم",
    "/super-admin/users": "إدارة المستخدمين",
    "/super-admin/offices": "إدارة المكاتب",
    "/super-admin/ministries": "وزارات و دوائر و هيئات",
    "/super-admin/parliament-members": "شؤون أعضاء مجلس النواب",
    "/super-admin/citizens": "تحليلات المكاتب",
    "/super-admin/reports": "التقارير",
    "/super-admin/evaluation": "التقييم",
    "/super-admin/meetings": "اجتماعات",
    "/super-admin/supervision-calculators": "حاسبات الإشراف والمراقبة",
    "/super-admin/supervision-calculators/add": "إضافة حساب الإشراف والمراقبة",
    "/super-admin/transaction-form": "إدارة صفحة المعاملة",
  };
  if (pathname in map) return ["الإدارة العليا", map[pathname]];
  if (pathname.startsWith("/super-admin/")) return ["الإدارة العليا", "لوحة التحكم"];
  return ["الإدارة العليا", "لوحة التحكم"];
}

const NAV_GROUPS = [
  {
    title: "رئيسي",
    items: [{ href: "/super-admin", label: "لوحة التحكم", badgeKey: "today" as const }],
  },
  {
    title: "إدارة",
    items: [
      { href: "/super-admin/offices", label: "إدارة المكاتب" },
      { href: "/super-admin/users", label: "إدارة المستخدمين" },
      { href: "/super-admin/transaction-form", label: "إدارة صفحة المعاملة" },
      { href: "/super-admin/citizens", label: "تحليلات المكاتب" },
      { href: "/super-admin/meetings", label: "اجتماعات" },
      { href: "/super-admin/supervision-calculators", label: "حاسبات الإشراف والمراقبة" },
    ],
  },
  {
    title: "مجلس النواب العراقي",
    items: [
      { href: "/super-admin/parliament-members", label: "شؤون أعضاء مجلس النواب" },
      { href: "/super-admin/ministries", label: "وزارات و دوائر و هيئات" },
    ],
  },
  {
    title: "تقارير",
    items: [
      { href: "/super-admin/reports", label: "التقارير", badgeKey: "overdue" as const },
      { href: "/super-admin/evaluation", label: "التقييم" },
    ],
  },
];

const SIDEBAR_COLLAPSED_KEY = "super-admin-sidebar-collapsed";

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/super-admin": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  "/super-admin/users": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  "/super-admin/offices": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  "/super-admin/ministries": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  ),
  "/super-admin/parliament-members": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M3 7v2a4 4 0 004 4h4a4 4 0 004-4V7" />
    </svg>
  ),
  "/super-admin/citizens": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  "/super-admin/reports": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  "/super-admin/evaluation": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  "/super-admin/meetings": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  "/super-admin/supervision-calculators": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  "/super-admin/transaction-form": (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [badges, setBadges] = useState<{ today: number; overdue: number }>({ today: 0, overdue: 0 });
  const [time, setTime] = useState(() => new Date());
  const breadcrumb = useMemo(() => getBreadcrumb(pathname), [pathname]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/super-admin/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((s) => {
        if (s) setBadges({ today: s.transactionsToday ?? 0, overdue: s.overdueCount ?? 0 });
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="flex min-h-dvh bg-[#F6F8FB]" dir="rtl">
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-l border-[#E6EAF0] bg-white transition-[width,transform] duration-300 ease-in-out lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 print:hidden ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } ${sidebarCollapsed ? "w-[72px]" : "w-64"}`}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-3">
          {!sidebarCollapsed ? (
            <Link href="/super-admin" className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F6F8FB]">
                <img src="/gatmark.png" alt="بوابة الصادقون" className="h-full w-full object-contain" />
              </span>
              <span className="truncate text-[15px] font-semibold text-[#101828]">بوابة الصادقون</span>
            </Link>
          ) : (
            <Link href="/super-admin" title="لوحة التحكم" className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F6F8FB]">
              <img src="/gatmark.png" alt="بوابة الصادقون" className="h-full w-full object-contain" />
            </Link>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden rounded-xl p-2 text-[#667085] hover:bg-[#F6F8FB] lg:flex"
              aria-label={sidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}
              title={sidebarCollapsed ? "توسيع" : "طي"}
            >
              <svg className={`h-5 w-5 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-xl p-2 text-[#667085] hover:bg-[#F6F8FB] lg:hidden"
              aria-label="إغلاق القائمة"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mt-5 first:mt-0">
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-[11px] font-medium text-[#98A2B3]">
                  {group.title}
                </p>
              )}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/super-admin" && pathname.startsWith(item.href));
                  const badge = item.badgeKey === "today" ? badges.today : item.badgeKey === "overdue" ? badges.overdue : null;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-200 ${
                        isActive
                          ? "bg-[#1e3a5f] text-white"
                          : "text-[#344054] hover:bg-[#F6F8FB] hover:text-[#1e3a5f]"
                      }`}
                    >
                      {isActive && sidebarCollapsed && (
                        <span
                          className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white"
                          aria-hidden
                        />
                      )}
                      <span className={isActive ? "text-white" : "text-[#98A2B3] group-hover:text-[#1e3a5f]"}>
                        {NAV_ICONS[item.href]}
                      </span>
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge != null && badge > 0 && (
                            <span
                              title={item.badgeKey === "overdue" ? "معاملات متأخرة" : "عدد المعاملات المُنشأة اليوم"}
                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                item.badgeKey === "overdue"
                                  ? "bg-red-50 text-red-600"
                                  : isActive
                                    ? "bg-white/15 text-white"
                                    : "bg-[#F6F8FB] text-[#1e3a5f]"
                              }`}
                            >
                              {badge}
                              <span className="text-[10px] font-normal opacity-90">
                                {item.badgeKey === "overdue" ? "متأخرة" : "اليوم"}
                              </span>
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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
        <button
          type="button"
          aria-label="إغلاق"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#E6EAF0] bg-white/90 px-3 py-2 backdrop-blur-md sm:gap-4 sm:px-6 print:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-[#667085] hover:bg-[#F6F8FB] lg:hidden"
            aria-label="فتح القائمة"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden items-center gap-2 text-sm text-[#667085] sm:flex">
                <Link href="/super-admin" className="hover:text-[#1e3a5f]">
                  {breadcrumb[0]}
                </Link>
                <span className="text-[#D0D5DD]">/</span>
                <span className="font-medium text-[#101828]">{breadcrumb[1]}</span>
              </div>
              <h1 className="truncate text-base font-semibold text-[#101828] sm:hidden">{breadcrumb[1]}</h1>
            </div>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <p className="max-w-[9.5rem] truncate text-[11px] tabular-nums text-[#667085] sm:max-w-none sm:text-sm" suppressHydrationWarning>
                {formatDateTime(time)}
              </p>
              <div className="h-4 w-px bg-[#E6EAF0]" />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="relative rounded-xl p-2 text-[#667085] hover:bg-[#F6F8FB]"
                  aria-label="الإشعارات"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {badges.overdue > 0 && (
                    <span className="absolute -top-0.5 -left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {badges.overdue > 99 ? "99+" : badges.overdue}
                    </span>
                  )}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="flex items-center gap-2 rounded-xl bg-[#F6F8FB] px-2.5 py-2 text-sm font-medium text-[#101828] hover:bg-[#EEF2F6] sm:px-3"
                  >
                    <span className="hidden sm:inline">الحساب</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <>
                      <button type="button" className="fixed inset-0 z-10" aria-hidden onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute left-0 top-full z-20 mt-1.5 min-w-[140px] rounded-2xl border border-[#E6EAF0] bg-white py-1 shadow-[0_12px_32px_rgba(16,24,40,0.08)]">
                        <button
                          type="button"
                          onClick={() => void safeSignOut()}
                          className="w-full px-4 py-2 text-right text-sm text-[#101828] hover:bg-[#F6F8FB]"
                        >
                          خروج
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}