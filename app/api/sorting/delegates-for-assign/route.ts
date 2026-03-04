import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrReceptionOrSorting } from "@/lib/api-auth";

/**
 * إرجاع قائمة المخولين مع اقتراح ذكي بناءً على المعاملة.
 * يقارن formationId في المعاملة مع formationIds المرتبطة بكل مخول.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminOrReceptionOrSorting();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  if (!officeId) {
    return NextResponse.json({ delegates: [], suggestedIds: [] });
  }

  const transactionId = request.nextUrl.searchParams.get("transactionId")?.trim();

  let transactionFormationId: string | null = null;
  if (transactionId) {
    const tx = await prisma.transaction.findFirst({
      where: { id: transactionId, officeId },
      select: { formationId: true },
    });
    transactionFormationId = tx?.formationId ?? null;
  }

  const delegatesRaw = await prisma.delegate.findMany({
    where: {
      status: "ACTIVE",
      userId: { not: null },
      OR: [{ officeId: null }, { officeId }],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      formationIds: true,
      userId: true,
    },
  });
  const userIds = [...new Set(delegatesRaw.map((d) => d.userId!).filter(Boolean))];
  const existingUsers =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userById = Object.fromEntries(existingUsers.map((u) => [u.id, u]));
  const delegates = delegatesRaw.filter((d) => d.userId && userById[d.userId]);

  const formationIdsRaw = delegates
    .map((d) => d.formationIds)
    .filter((f): f is string[] => Array.isArray(f) && f.length > 0);
  const formationIdsUnique = [...new Set(formationIdsRaw.flatMap((arr) => arr.filter((id): id is string => typeof id === "string")))];
  const formations =
    formationIdsUnique.length > 0
      ? await prisma.formation.findMany({
          where: { id: { in: formationIdsUnique } },
          select: { id: true, name: true, type: true },
        })
      : [];

  const formationMap = Object.fromEntries(formations.map((f) => [f.id, f]));

  const delegatesWithFormations = delegates.map((d) => {
    const ids = (Array.isArray(d.formationIds) ? d.formationIds : []).filter((id): id is string => typeof id === "string");
    const formationNames = ids
      .map((id) => formationMap[id]?.name)
      .filter(Boolean) as string[];
    const isSuggested = !!transactionFormationId && ids.includes(transactionFormationId);
    const u = d.userId ? userById[d.userId] : null;
    return {
      id: d.id,
      name: u?.name ?? u?.email ?? d.name ?? "بدون اسم",
      formationNames,
      formationIds: ids,
      isSuggested,
    };
  });

  const suggestedIds = delegatesWithFormations
    .filter((d) => d.isSuggested)
    .map((d) => d.id);

  return NextResponse.json({
    delegates: delegatesWithFormations,
    suggestedIds,
    transactionFormationId,
  });
}
