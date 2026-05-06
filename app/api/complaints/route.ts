import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const IRAQI_PHONE_REGEX = /^(?:\+964|964|0)?7[3-9]\d{8}$/;

type ComplaintPayload = {
  type?: "SECRET" | "PUBLIC";
  name?: string;
  address?: string;
  phone?: string;
  details?: string;
  attachments?: string[];
};

export async function POST(request: NextRequest) {
  let body: ComplaintPayload;
  try {
    body = (await request.json()) as ComplaintPayload;
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة." }, { status: 400 });
  }

  const type = body.type;
  const name = body.name?.trim() ?? "";
  const address = body.address?.trim() ?? "";
  const phone = body.phone?.trim().replace(/\s|-/g, "") ?? "";
  const details = body.details?.trim() ?? "";
  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];

  if (type !== "SECRET" && type !== "PUBLIC") {
    return NextResponse.json({ error: "نوع الشكوى غير صالح." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "الاسم مطلوب." }, { status: 400 });
  }
  if (!IRAQI_PHONE_REGEX.test(phone)) {
    return NextResponse.json({ error: "رقم الهاتف العراقي غير صالح." }, { status: 400 });
  }
  if (!details) {
    return NextResponse.json({ error: "تفاصيل الشكوى مطلوبة." }, { status: 400 });
  }

  const complaintId = randomUUID();
  const now = new Date();
  const attachmentsJson = attachments.length > 0 ? JSON.stringify(attachments) : null;
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `INSERT INTO "Complaint" ("id", "type", "name", "address", "phone", "details", "attachments", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     RETURNING "id"`,
    complaintId,
    type,
    name,
    address || null,
    phone,
    details,
    attachmentsJson,
    now,
    now
  );

  return NextResponse.json({
    message: "تم ارسال شكوتك بنجاح سيتم التعامل معها والتواصل معك",
    id: rows[0]?.id ?? complaintId,
  });
}
