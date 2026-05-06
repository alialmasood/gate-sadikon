import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

  try {
    const complaintId = randomUUID();
    const created = await prisma.complaint.create({
      data: {
        id: complaintId,
        type,
        name,
        address: address || null,
        phone,
        details,
        attachments: attachments.length > 0 ? attachments : undefined,
      },
      select: { id: true },
    });

    return NextResponse.json({
      message: "تم ارسال شكوتك بنجاح سيتم التعامل معها والتواصل معك",
      id: created.id ?? complaintId,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2010" || error.code === "P2021")
    ) {
      return NextResponse.json(
        {
          error:
            "خدمة الشكاوى غير مهيأة في قاعدة البيانات الحالية. يرجى تنفيذ ترحيلات Prisma (migrations) ثم إعادة المحاولة.",
        },
        { status: 503 }
      );
    }
    throw error;
  }
}
