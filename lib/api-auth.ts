import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const secret = process.env.NEXTAUTH_SECRET;

/** التحقق من الجلسة ضد قاعدة البيانات: المستخدم موجود ومفعّل */
export async function getSessionWithDbValidation(req?: NextRequest) {
  let userId: string | undefined;
  let session: { user?: { id?: string } } | null = null;
  if (req && secret) {
    const token = await getToken({ req, secret });
    userId = token?.sub ?? undefined;
  }
  if (!userId) {
    session = await getServerSession(authOptions);
    userId = (session?.user as { id?: string } | undefined)?.id;
  }
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, enabled: true, role: true, officeId: true },
  });
  if (!user || !user.enabled) return null;
  const effectiveSession = session ?? { user: { id: user.id } };
  return { session: effectiveSession, user };
}

/** مدير مكتب: يجب أن يكون ADMIN وله officeId */
export async function requireAdmin() {
  const result = await getSessionWithDbValidation();
  if (!result) {
    return { error: "غير مصرح", status: 403 };
  }
  if (result.user.role !== "ADMIN") {
    return { error: "غير مصرح", status: 403 };
  }
  const officeId = result.user.officeId;
  if (!officeId) {
    return { error: "الحساب غير مرتبط بمكتب", status: 403 };
  }
  return { session: result.session, officeId };
}

/** للقراءة فقط (مثل قائمة التشكيلات): ADMIN أو RECEPTION أو SUPER_ADMIN — لا يشترط officeId */
export async function requireAdminOrReceptionOrSuperAdminForRead() {
  const result = await getSessionWithDbValidation();
  if (!result) {
    return { error: "غير مصرح", status: 403 };
  }
  const { role } = result.user;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN" && role !== "RECEPTION") {
    return { error: "غير مصرح", status: 403 };
  }
  return { session: result.session, officeId: result.user.officeId };
}

/** مدير مكتب أو موظف استقبال: ADMIN أو RECEPTION — للقراءة يعيد officeId حتى إن كان null، للكتابة (POST) يشترط officeId */
export async function requireAdminOrReception(req?: NextRequest) {
  const result = await getSessionWithDbValidation(req);
  if (!result) {
    return { error: "غير مصرح", status: 403 };
  }
  if (result.user.role !== "ADMIN" && result.user.role !== "RECEPTION") {
    return { error: "غير مصرح", status: 403 };
  }
  const officeId = result.user.officeId ?? undefined;
  return { session: result.session, officeId, role: result.user.role };
}

/** مدير مكتب أو موظف استقبال أو قسم الفرز أو تنسيق ومتابعة — للقراءة وعرض تفاصيل المعاملات، SORTING يمكنه تعيين عاجل فقط */
export async function requireAdminOrReceptionOrSorting(req?: NextRequest) {
  const result = await getSessionWithDbValidation(req);
  if (!result) {
    return { error: "غير مصرح", status: 403 };
  }
  const { role } = result.user;
  if (role !== "ADMIN" && role !== "RECEPTION" && role !== "SORTING" && role !== "COORDINATOR") {
    return { error: "غير مصرح", status: 403 };
  }
  const officeId = result.user.officeId ?? undefined;
  return { session: result.session, officeId, role };
}

/** مدير مكتب أو قسم التوثيق أو قسم المتابعة — للوصول لمعاملات المكتب */
export async function requireAdminOrDocumentationOrCoordinator(req?: NextRequest) {
  const result = await getSessionWithDbValidation(req);
  if (!result) return { error: "غير مصرح", status: 403 };
  const { role } = result.user;
  if (role !== "ADMIN" && role !== "DOCUMENTATION" && role !== "COORDINATOR") {
    return { error: "غير مصرح", status: 403 };
  }
  const officeId = result.user.officeId ?? undefined;
  if (!officeId) return { error: "الحساب غير مرتبط بمكتب", status: 403 };
  return { session: result.session, officeId, role };
}

/** سوبر أدمن أو مدير مكتب */
export async function requireSuperAdminOrAdmin() {
  const result = await getSessionWithDbValidation();
  if (!result) return { error: "غير مصرح", status: 403 };
  if (result.user.role !== "SUPER_ADMIN" && result.user.role !== "ADMIN") return { error: "غير مصرح", status: 403 };
  return { session: result.session, role: result.user.role, officeId: result.user.officeId };
}

/** سوبر أدمن أو مدير مكتب أو موظف استقبال (لرفع المرفقات في فورم المعاملات) */
export async function requireSuperAdminOrAdminOrReception() {
  const result = await getSessionWithDbValidation();
  if (!result) return { error: "غير مصرح", status: 403 };
  const { role } = result.user;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN" && role !== "RECEPTION") return { error: "غير مصرح", status: 403 };
  return { session: result.session, role, officeId: result.user.officeId };
}

export async function requireSuperAdmin(req?: NextRequest) {
  const result = await getSessionWithDbValidation(req);
  if (!result) {
    return { error: "غير مصرح", status: 403 };
  }
  if (result.user.role !== "SUPER_ADMIN") {
    return { error: "غير مصرح", status: 403 };
  }
  return { session: result.session, userId: result.user.id };
}

/** المشرف — SUPERVISION (حاسبات الإشراف والمراقبة) */
export async function requireSupervision(req?: NextRequest) {
  const result = await getSessionWithDbValidation(req);
  if (!result) return { error: "غير مصرح", status: 403 };
  if (result.user.role !== "SUPERVISION") return { error: "غير مصرح", status: 403 };
  return { session: result.session, userId: result.user.id };
}

/** عضو مجلس النواب — PARLIAMENT_MEMBER */
export async function requireParliamentMember(req?: NextRequest) {
  const result = await getSessionWithDbValidation(req);
  if (!result) return { error: "غير مصرح", status: 403 };
  if (result.user.role !== "PARLIAMENT_MEMBER") return { error: "غير مصرح", status: 403 };
  return { session: result.session, userId: result.user.id };
}

/** المخول: USER مع delegate مرتبط بحسابه — يُرجع delegateId */
export async function requireDelegate(req?: NextRequest) {
  const result = await getSessionWithDbValidation(req);
  if (!result) {
    return { error: "غير مصرح", status: 403 };
  }
  if (result.user.role !== "USER") {
    return { error: "غير مصرح", status: 403 };
  }
  let delegate = await prisma.delegate.findFirst({
    where: { userId: result.user.id },
    select: { id: true },
  });
  if (!delegate) {
    const fullUser = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: { serialNumber: true, name: true, email: true, officeId: true },
    });
    const isDelegate = fullUser?.serialNumber && String(fullUser.serialNumber).startsWith("DEL-");
    if (isDelegate && fullUser) {
      delegate = await prisma.delegate.create({
        data: {
          userId: result.user.id,
          name: fullUser.name || fullUser.email,
          officeId: fullUser.officeId,
          status: "ACTIVE",
        },
        select: { id: true },
      });
    } else {
      return { error: "الحساب غير مرتبط بمخول", status: 403 };
    }
  }
  return { session: result.session, delegateId: delegate.id };
}
