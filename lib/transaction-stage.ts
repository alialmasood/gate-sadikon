export const SOURCE_SECTION_LABELS: Record<string, string> = {
  RECEPTION: "الاستقبال",
  COORDINATOR: "التنسيق والمتابعة",
  DOCUMENTATION: "التوثيق",
  ADMIN: "مدير المكتب",
  SORTING: "الفرز",
};

export type StageInput = {
  status?: string | null;
  completedByAdmin?: boolean | null;
  cannotComplete?: boolean | null;
  urgent?: boolean | null;
  reachedSorting?: boolean | null;
  sourceSection?: string | null;
  delegateId?: string | null;
};

/** المرحلة الحالية للمعاملة كما تظهر في سير العمل */
export function getTransactionStageLabel(t: StageInput): string {
  if (t.completedByAdmin || t.status === "DONE") return "منجزة";
  if (t.cannotComplete) return "تعذر الإنجاز";
  if (t.status === "OVERDUE") return "متأخرة";
  if (t.delegateId) {
    if (t.urgent) return "لدى المخول — عاجلة";
    if (t.reachedSorting) return "لدى المخول — بعد قسم الفرز";
    return "لدى المخول";
  }
  if (t.urgent) return "قسم المتابعة (عاجل)";
  if (t.reachedSorting) return "قسم الفرز";
  if (t.sourceSection && SOURCE_SECTION_LABELS[t.sourceSection]) {
    return SOURCE_SECTION_LABELS[t.sourceSection];
  }
  return "قيد التنفيذ";
}

export type StoredDelegateAction = {
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
  kind?: "TRANSFER";
  officeName?: string;
  fromDelegateName?: string;
  toDelegateName?: string;
  stageLabel?: string;
};

export function isTransferAction(value: unknown): value is StoredDelegateAction {
  return !!value && typeof value === "object" && (value as StoredDelegateAction).kind === "TRANSFER";
}

export function latestTransferAction(actions: unknown): StoredDelegateAction | null {
  if (!Array.isArray(actions)) return null;
  for (let i = actions.length - 1; i >= 0; i -= 1) {
    if (isTransferAction(actions[i])) return actions[i];
  }
  return null;
}

export function isTransactionCompleted(t: { status?: string | null; completedByAdmin?: boolean | null }): boolean {
  return t.completedByAdmin === true || t.status === "DONE";
}

/** المدة بين تاريخ الاستلام ونهاية الفترة (تاريخ الإنجاز أو الآن) */
export function formatElapsedSince(fromIso: string | Date | null | undefined, toIso?: string | Date | null): string {
  if (!fromIso) return "—";
  const start = new Date(fromIso).getTime();
  const end = toIso ? new Date(toIso).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return "—";
  const minutes = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return months === 1 ? "شهر واحد" : `${months} أشهر`;
  }
  if (days >= 1) {
    if (days === 1) return "يوم واحد";
    if (days === 2) return "يومان";
    if (days <= 10) return `${days} أيام`;
    return `${days} يوماً`;
  }
  if (hours >= 1) {
    if (hours === 1) return "ساعة واحدة";
    if (hours === 2) return "ساعتان";
    if (hours <= 10) return `${hours} ساعات`;
    return `${hours} ساعة`;
  }
  if (minutes <= 1) return "أقل من ساعة";
  return `${minutes} دقيقة`;
}

export function workActions(actions: unknown): StoredDelegateAction[] {
  if (!Array.isArray(actions)) return [];
  return actions.filter((a): a is StoredDelegateAction => !!a && typeof a === "object" && !isTransferAction(a));
}
