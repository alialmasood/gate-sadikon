"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

function getDashboardUrl(role: string | undefined): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "ADMIN":
      return "/admin";
    case "USER":
      return "/user";
    default:
      return "/";
  }
}

export default function ForbiddenPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const dashboardUrl = getDashboardUrl(role);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F6F8] p-6" dir="rtl">
      <article className="w-full max-w-md rounded-2xl border border-[#B88A1A]/20 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-[#1B1B1B]">الوصول مرفوض</h1>
        <p className="mt-3 text-[#5a5a5a]">
          ليس لديك صلاحية للوصول إلى هذه الصفحة.
        </p>
        <Link
          href={dashboardUrl}
          className="mt-6 inline-flex rounded-xl bg-[#B08D57] px-6 py-2.5 font-medium text-white hover:bg-[#9C7B49]"
        >
          العودة إلى لوحة التحكم
        </Link>
      </article>
    </div>
  );
}
