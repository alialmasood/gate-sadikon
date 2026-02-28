import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrReception } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrReception(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  if (!officeId) {
    return NextResponse.json({ transactions: [], overdueCount: 0 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 200);

  const where: { officeId: string; status?: string } = { officeId };
  if (status) where.status = status;

  const [transactions, overdueCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { delegate: { select: { name: true } } },
    }),
    prisma.transaction.count({ where: { officeId, status: "OVERDUE" } }),
  ]);

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      citizenName: t.citizenName,
      citizenPhone: t.citizenPhone,
      citizenAddress: t.citizenAddress,
      citizenIsEmployee: t.citizenIsEmployee,
      citizenEmployeeSector: t.citizenEmployeeSector,
      citizenMinistry: t.citizenMinistry,
      citizenDepartment: t.citizenDepartment,
      citizenOrganization: t.citizenOrganization,
      status: t.status,
      type: t.type,
      transactionType: t.transactionType,
      transactionTitle: t.transactionTitle,
      serialNumber: t.serialNumber,
      submissionDate: t.submissionDate,
      attachments: t.attachments,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      delegateName: t.delegate?.name ?? null,
      urgent: t.urgent,
      cannotComplete: t.cannotComplete,
      reachedSorting: t.reachedSorting,
      completedByAdmin: t.completedByAdmin ?? false,
    })),
    overdueCount,
  });
}

async function generateUniqueSerial(): Promise<string> {
  const txns = await prisma.transaction.findMany({
    where: { serialNumber: { not: null } },
    select: { serialNumber: true },
  });
  const nums = txns
    .map((t) => parseInt(t.serialNumber!, 10))
    .filter((n) => !isNaN(n) && n >= 0);
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  const next = String(max + 1).padStart(6, "0");
  const exists = await prisma.transaction.findUnique({ where: { serialNumber: next } });
  if (exists) return generateUniqueSerial();
  return next;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminOrReception(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  if (!officeId) {
    return NextResponse.json({ error: "الحساب غير مرتبط بمكتب — يرجى التواصل مع المدير لربط حسابك بمكتب" }, { status: 403 });
  }

  let body: {
    citizenName?: string;
    citizenPhone?: string;
    citizenAddress?: string;
    citizenIsEmployee?: boolean;
    citizenEmployeeSector?: string;
    citizenMinistry?: string;
    citizenDepartment?: string;
    citizenOrganization?: string;
    transactionType?: string;
    transactionTitle?: string;
    submissionDate?: string;
    formationId?: string;
    subDeptId?: string;
    attachments?: { url: string; name?: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const citizenName = typeof body.citizenName === "string" ? body.citizenName.trim() || null : null;
  const citizenPhone = typeof body.citizenPhone === "string" ? body.citizenPhone.trim() || null : null;
  const citizenAddress = typeof body.citizenAddress === "string" ? body.citizenAddress.trim() || null : null;
  const citizenIsEmployee = typeof body.citizenIsEmployee === "boolean" ? body.citizenIsEmployee : undefined;
  const citizenEmployeeSector =
    typeof body.citizenEmployeeSector === "string" &&
    ["GOVERNMENT", "PRIVATE", "MIXED", "NOT_LINKED", "OTHER"].includes(body.citizenEmployeeSector)
      ? body.citizenEmployeeSector
      : null;
  const citizenMinistry = typeof body.citizenMinistry === "string" ? body.citizenMinistry.trim() || null : null;
  const citizenDepartment = typeof body.citizenDepartment === "string" ? body.citizenDepartment.trim() || null : null;
  const citizenOrganization = typeof body.citizenOrganization === "string" ? body.citizenOrganization.trim() || null : null;
  const transactionType = typeof body.transactionType === "string" ? body.transactionType.trim() || null : null;
  const transactionTitle = typeof body.transactionTitle === "string" ? body.transactionTitle.trim() || null : null;
  const formationId = typeof body.formationId === "string" ? body.formationId.trim() || null : null;
  const subDeptId = typeof body.subDeptId === "string" ? body.subDeptId.trim() || null : null;

  let submissionDate: Date | null = null;
  if (typeof body.submissionDate === "string" && body.submissionDate.trim()) {
    const d = new Date(body.submissionDate);
    if (!isNaN(d.getTime())) submissionDate = d;
  }

  const attachments =
    Array.isArray(body.attachments) && body.attachments.length > 0
      ? body.attachments
          .filter((a): a is { url: string; name?: string } => typeof a?.url === "string")
          .map((a) => ({ url: a.url, name: typeof a.name === "string" ? a.name : undefined }))
      : null;

  const serialNumber = await generateUniqueSerial();

  const transaction = await prisma.transaction.create({
    data: {
      citizenName,
      citizenPhone,
      citizenAddress,
      citizenIsEmployee,
      citizenEmployeeSector,
      citizenMinistry,
      citizenDepartment,
      citizenOrganization,
      officeId,
      status: "PENDING",
      type: transactionType,
      transactionType,
      transactionTitle,
      submissionDate,
      formationId,
      subDeptId,
      serialNumber,
      attachments: attachments ? (attachments as object) : undefined,
    },
    include: {
      delegate: { select: { name: true } },
      office: { select: { name: true } },
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const followUpUrl = `${baseUrl}/track?sn=${serialNumber}`;

  return NextResponse.json({
    id: transaction.id,
    citizenName: transaction.citizenName,
    citizenPhone: transaction.citizenPhone,
    status: transaction.status,
    transactionType: transaction.transactionType,
    serialNumber: transaction.serialNumber,
    followUpUrl,
    officeName: transaction.office?.name ?? null,
    createdAt: transaction.createdAt,
    submissionDate: transaction.submissionDate,
  });
}
