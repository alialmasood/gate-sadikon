"use client";

export default function AuthorizedDashboard() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6" dir="rtl">
      <div>
        <h2 className="text-base font-semibold text-[#1B1B1B] sm:text-lg">مرحباً، المخول</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">لوحة تحكم المخولين — قيد التطوير</p>
      </div>
      <div className="rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-8">
        <p className="text-center text-sm text-[#5a5a5a] sm:text-base">سيتم إضافة المزايا المخصصة للمخولين قريباً.</p>
      </div>
    </div>
  );
}
