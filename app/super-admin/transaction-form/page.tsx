"use client";

import { FormFieldOptionsEditor } from "@/components/FormFieldOptionsEditor";

export default function TransactionFormAdminPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F8] p-4 md:p-8" dir="rtl">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="rounded-2xl border border-[#d4cfc8] bg-white px-6 py-5 shadow-sm">
          <h1 className="text-2xl font-bold text-[#1B1B1B] md:text-3xl">إدارة صفحة المعاملة</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#5a5a5a] md:text-base">
            إعداد قوائم نموذج معاملة جديدة (استقبال وغيرها). كل حقل له جدول مستقل؛ التغييرات تنعكس
            على القوائم المنسدلة فوراً.
          </p>
        </header>

        <FormFieldOptionsEditor
          title="نوع التوظيف"
          description="القائمة المنسدلة «نوع التوظيف» في نموذج معاملة جديدة (استقبال — مواطن جديد)."
          apiBase="/api/super-admin/form-options/employee-sector"
          showValueCode={false}
        />

        <FormFieldOptionsEditor
          title="نوع المعاملة"
          description="القائمة المنسدلة «نوع المعاملة» في نفس نموذج معاملة جديدة (استقبال — مواطن جديد)."
          apiBase="/api/super-admin/form-options/transaction-type"
          showValueCode={false}
        />
      </div>
    </div>
  );
}
