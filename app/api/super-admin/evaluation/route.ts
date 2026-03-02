import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatDuration(ms: number): string {
  if (ms < 60000) return "أقل من دقيقة";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} يوم`);
  if (hours % 24 > 0) parts.push(`${hours % 24} ساعة`);
  if (minutes % 60 > 0 && days === 0) parts.push(`${minutes % 60} دقيقة`);
  return parts.length ? parts.join(" و ") : "—";
}

function formatPeriodLabel(period: string): string {
  const [y, m] = period.split("-");
  const monthNames: Record<string, string> = {
    "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل", "05": "مايو", "06": "يونيو",
    "07": "يوليو", "08": "أغسطس", "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
  };
  return `${monthNames[m] || m} ${y}`;
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = request.nextUrl;
  const period = searchParams.get("period") || getCurrentPeriod();

  const [offices, delegates, users, transactions, evaluations] = await Promise.all([
    prisma.office.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.delegate.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, officeId: true, userId: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { not: "SUPER_ADMIN" }, enabled: true },
      select: { id: true, name: true, email: true, role: true, officeId: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      where: { status: "DONE", completedAt: { not: null } },
      select: {
        id: true,
        officeId: true,
        delegateId: true,
        citizenName: true,
        serialNumber: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.evaluation.findMany({
      where: { period },
      select: { entityType: true, entityId: true, period: true, rating: true, notes: true, evaluatedAt: true },
    }),
  ]);

  const allEvaluations = await prisma.evaluation.findMany({
    select: { entityType: true, entityId: true, period: true, rating: true, notes: true, evaluatedAt: true },
    orderBy: { period: "desc" },
  });

  const officeMap = Object.fromEntries(offices.map((o) => [o.id, o]));

  const evalMapForPeriod = Object.fromEntries(
    evaluations.map((e) => [`${e.entityType}:${e.entityId}`, { rating: e.rating, notes: e.notes, evaluatedAt: e.evaluatedAt, period: e.period }])
  );

  const evalHistoryMap: Record<string, { period: string; rating: number | null; notes: string | null; evaluatedAt: string }[]> = {};
  for (const e of allEvaluations) {
    const key = `${e.entityType}:${e.entityId}`;
    if (!evalHistoryMap[key]) evalHistoryMap[key] = [];
    evalHistoryMap[key].push({
      period: e.period,
      rating: e.rating,
      notes: e.notes,
      evaluatedAt: e.evaluatedAt.toISOString(),
    });
  }

  const getDuration = (t: { createdAt: Date; completedAt: Date | null }) => {
    if (!t.completedAt) return null;
    const ms = new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime();
    return { ms, formatted: formatDuration(ms) };
  };

  const officeData = offices.map((o) => {
    const officeTxns = transactions.filter((t) => t.officeId === o.id);
    const durations = officeTxns
      .map((t) => getDuration(t))
      .filter((d): d is { ms: number; formatted: string } => d !== null);
    const avgMs = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d.ms, 0) / durations.length) : null;
    const evalData = evalMapForPeriod[`OFFICE:${o.id}`] ?? null;
    const history = evalHistoryMap[`OFFICE:${o.id}`] ?? [];
    return {
      id: o.id,
      name: o.name,
      type: o.type,
      transactionCount: officeTxns.length,
      avgDuration: avgMs != null ? formatDuration(avgMs) : "—",
      avgDurationMs: avgMs,
      transactions: officeTxns.slice(0, 20).map((t) => ({
        id: t.id,
        serialNumber: t.serialNumber,
        citizenName: t.citizenName,
        duration: getDuration(t)?.formatted ?? "—",
      })),
      evaluation: evalData ?? null,
      evaluationHistory: history,
    };
  });

  const delegateData = delegates.map((d) => {
    const delegateTxns = transactions.filter((t) => t.delegateId === d.id);
    const durations = delegateTxns
      .map((t) => getDuration(t))
      .filter((d): d is { ms: number; formatted: string } => d !== null);
    const avgMs = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d.ms, 0) / durations.length) : null;
    const evalData = evalMapForPeriod[`DELEGATE:${d.id}`] ?? null;
    const history = evalHistoryMap[`DELEGATE:${d.id}`] ?? [];
    return {
      id: d.id,
      name: d.name ?? "مخول",
      officeName: d.officeId ? officeMap[d.officeId]?.name ?? null : null,
      transactionCount: delegateTxns.length,
      avgDuration: avgMs != null ? formatDuration(avgMs) : "—",
      avgDurationMs: avgMs,
      transactions: delegateTxns.slice(0, 20).map((t) => ({
        id: t.id,
        serialNumber: t.serialNumber,
        citizenName: t.citizenName,
        duration: getDuration(t)?.formatted ?? "—",
      })),
      evaluation: evalData ?? null,
      evaluationHistory: history,
    };
  });

  const userData = users.map((u) => {
    const office = u.officeId ? officeMap[u.officeId] : null;
    const delegate = delegates.find((d) => d.userId === u.id);
    const delegateTxns = delegate ? transactions.filter((t) => t.delegateId === delegate.id) : [];
    const durations = delegateTxns
      .map((t) => getDuration(t))
      .filter((d): d is { ms: number; formatted: string } => d !== null);
    const avgMs = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d.ms, 0) / durations.length) : null;
    const evalData = evalMapForPeriod[`USER:${u.id}`] ?? null;
    const history = evalHistoryMap[`USER:${u.id}`] ?? [];
    const isAdmin = ["ADMIN", "RECEPTION", "COORDINATOR", "SORTING", "DOCUMENTATION"].includes(u.role);
    return {
      id: u.id,
      name: u.name ?? u.email,
      email: u.email,
      role: u.role,
      officeName: office?.name ?? null,
      isDelegate: !!delegate,
      isAdmin,
      transactionCount: delegateTxns.length,
      avgDuration: avgMs != null ? formatDuration(avgMs) : "—",
      evaluation: evalData ?? null,
      evaluationHistory: history,
    };
  });

  const topOffices = [...officeData]
    .filter((o) => o.evaluation?.rating != null)
    .sort((a, b) => (b.evaluation?.rating ?? 0) - (a.evaluation?.rating ?? 0))
    .slice(0, 10);
  const topDelegates = [...delegateData]
    .filter((d) => d.evaluation?.rating != null)
    .sort((a, b) => (b.evaluation?.rating ?? 0) - (a.evaluation?.rating ?? 0))
    .slice(0, 10);
  const topAdmins = [...userData]
    .filter((u) => u.isAdmin && u.evaluation?.rating != null)
    .sort((a, b) => (b.evaluation?.rating ?? 0) - (a.evaluation?.rating ?? 0))
    .slice(0, 10);

  const chartOffices = topOffices.map((o) => ({ name: o.name, value: o.evaluation?.rating ?? 0 }));
  const chartDelegates = topDelegates.map((d) => ({ name: d.name ?? "مخول", value: d.evaluation?.rating ?? 0 }));
  const chartAdmins = topAdmins.map((a) => ({ name: a.name ?? a.email, value: a.evaluation?.rating ?? 0 }));

  return NextResponse.json({
    period,
    periodLabel: formatPeriodLabel(period),
    offices: officeData,
    delegates: delegateData,
    accounts: userData,
    topOffices,
    topDelegates,
    topAdmins,
    chartOffices,
    chartDelegates,
    chartAdmins,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const evaluatedById = auth.userId;
  if (!evaluatedById) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  let body: { entityType?: string; entityId?: string; period?: string; rating?: number; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const entityType = body.entityType;
  const entityId = body.entityId?.trim();
  const period = body.period?.trim() || getCurrentPeriod();
  const rating = typeof body.rating === "number" ? Math.min(5, Math.max(1, body.rating)) : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "المعرف والنوع مطلوبان" }, { status: 400 });
  }
  if (!["OFFICE", "DELEGATE", "USER"].includes(entityType)) {
    return NextResponse.json({ error: "نوع غير صالح" }, { status: 400 });
  }

  const evaluation = await prisma.evaluation.upsert({
    where: {
      entityType_entityId_period: { entityType, entityId, period },
    },
    create: {
      entityType,
      entityId,
      period,
      rating,
      notes,
      evaluatedById,
    },
    update: {
      rating,
      notes,
      evaluatedById,
      evaluatedAt: new Date(),
    },
    select: { id: true, period: true, rating: true, notes: true, evaluatedAt: true },
  });

  return NextResponse.json({
    id: evaluation.id,
    period: evaluation.period,
    rating: evaluation.rating,
    notes: evaluation.notes,
    evaluatedAt: evaluation.evaluatedAt,
  });
}
