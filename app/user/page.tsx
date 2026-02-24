"use client";

import { signOut } from "next-auth/react";

export default function UserPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F8] p-6" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">لوحة المستخدم (User)</h1>
        <article className="mt-6 rounded-2xl border border-[#B88A1A]/30 bg-white p-8 shadow-sm">
          <p className="text-[#4a4a4a]">مرحباً بك في لوحة المستخدم.</p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-6 rounded-xl border border-[#B08D57]/50 bg-[#B08D57] px-6 py-2.5 font-medium text-white hover:bg-[#9C7B49]"
          >
            تسجيل الخروج
          </button>
        </article>
      </div>
    </div>
  );
}
