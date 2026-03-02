"use client";

import { useEffect, useState } from "react";

type AssignmentItem = {
  id: string;
  formationId: string;
  formationName: string;
  formationType: string;
  subDeptId: string | null;
  subDeptName: string | null;
  createdAt: string;
};

export default function AuthorizedAssignmentsPage() {
  const [myAssignments, setMyAssignments] = useState<AssignmentItem[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  useEffect(() => {
    fetch("/api/authorized/my-assignments")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMyAssignments(Array.isArray(data) ? data : []))
      .catch(() => setMyAssignments([]))
      .finally(() => setLoadingAssignments(false));
  }, []);

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-[#1B1B1B] sm:text-2xl">التكليفات</h1>
        <p className="mt-1 text-sm text-[#5a5a5a]">المعاملات والصلاحيات المُعينة إليك</p>
      </div>

      {myAssignments.length > 0 && (
        <div className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1B1B1B]">تكليفاتي</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">الوزارات والدوائر المُعيَّنة لك من قبل الإدارة</p>
          {loadingAssignments ? (
            <p className="mt-4 text-sm text-[#5a5a5a]">جاري التحميل…</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myAssignments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/30 px-4 py-3"
                >
                  <span className="font-medium text-[#1B1B1B]">{a.formationName}</span>
                  {a.subDeptName && (
                    <>
                      <span className="text-[#5a5a5a]">—</span>
                      <span className="text-[#5a5a5a]">{a.subDeptName}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
