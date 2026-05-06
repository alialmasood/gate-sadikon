import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  try {
    const [total, secretCount, publicCount, todayCount, weekCount, complaints] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { type: "SECRET" } }),
      prisma.complaint.count({ where: { type: "PUBLIC" } }),
      prisma.complaint.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.complaint.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.complaint.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          name: true,
          address: true,
          phone: true,
          details: true,
          attachments: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        total,
        secretCount,
        publicCount,
        todayCount,
        weekCount,
        secretRatio: total ? Math.round((secretCount / total) * 100) : 0,
        publicRatio: total ? Math.round((publicCount / total) * 100) : 0,
      },
      complaints,
      setupNeeded: false,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json({
        stats: {
          total: 0,
          secretCount: 0,
          publicCount: 0,
          todayCount: 0,
          weekCount: 0,
          secretRatio: 0,
          publicRatio: 0,
        },
        complaints: [],
        setupNeeded: true,
        setupMessage: "جدول الشكاوى غير موجود في قاعدة البيانات الحالية. نفّذ أوامر Prisma migration ثم أعد تشغيل الخادم.",
      });
    }
    throw error;
  }
}
