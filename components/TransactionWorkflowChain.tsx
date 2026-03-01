"use client";

type WorkflowTransaction = {
  status?: string;
  urgent?: boolean;
  cannotComplete?: boolean;
  cannotCompleteReason?: string | null;
  delegateName?: string | null;
  reachedSorting?: boolean;
  completedByAdmin?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
};

function formatDate(s: string | null | undefined): string {
  if (!s) return "";
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      dateStyle: "short",
      timeStyle: "short",
      numberingSystem: "arab",
    }).format(new Date(s));
  } catch {
    return s;
  }
}

export function TransactionWorkflowChain({ transaction }: { transaction: WorkflowTransaction }) {
  const steps: { label: string; detail?: string; done: boolean }[] = [];

  steps.push({
    label: "الاستقبال — تسجيل المعاملة",
    detail: transaction.createdAt ? formatDate(transaction.createdAt) : undefined,
    done: true,
  });

  if (transaction.reachedSorting) {
    steps.push({
      label: "قسم الفرز — وصول المعاملة",
      done: true,
    });
  }

  if (transaction.urgent) {
    steps.push({
      label: "عاجل — إرسال لقسم المتابعة (التنسيق)",
      detail: transaction.updatedAt ? `تاريخ الإرسال: ${formatDate(transaction.updatedAt)}` : undefined,
      done: true,
    });
  }
  if (transaction.delegateName) {
    steps.push({
      label: `محوّلة للمخول — ${transaction.delegateName}`,
      detail: transaction.updatedAt ? `تاريخ الإحالة: ${formatDate(transaction.updatedAt)}` : undefined,
      done: true,
    });
  }
  if (transaction.cannotComplete) {
    steps.push({
      label: "تعذر إنجازها",
      detail: transaction.cannotCompleteReason ? `السبب: ${transaction.cannotCompleteReason}` : undefined,
      done: true,
    });
  }
  if (transaction.status === "OVERDUE") {
    steps.push({
      label: "متأخرة — تجاوزت المدة المحددة",
      done: true,
    });
  }
  if (transaction.completedByAdmin || transaction.status === "DONE") {
    steps.push({
      label: "منجزة — أُنجزت من قبل المدير",
      detail: transaction.completedAt ? `تاريخ الإنجاز: ${formatDate(transaction.completedAt)}` : undefined,
      done: true,
    });
  }

  if (steps.length <= 1 && transaction.reachedSorting) {
    steps.push({
      label: "قسم الفرز — وصول المعاملة وبانتظار الإجراء",
      done: true,
    });
  }

  return (
    <div className="rounded-xl border border-[#d4cfc8] bg-[#f6f3ed]/50 p-4" dir="rtl">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#5a5a5a]">سلسلة مسير المعاملة</p>
      <ol className="relative space-y-3 border-r-2 border-[#5B7C99]/30 pr-4">
        {steps.map((step, i) => (
          <li key={i} className="relative flex flex-col gap-0.5">
            <span className="absolute -right-[21px] top-1.5 h-3 w-3 rounded-full border-2 border-[#5B7C99] bg-white" />
            <span className="text-sm font-medium text-[#1B1B1B]">{step.label}</span>
            {step.detail && (
              <span className="text-xs text-[#5a5a5a]">{step.detail}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
