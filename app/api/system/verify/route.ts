import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.SYSTEM_SETUP_SECRET;

export async function GET(request: NextRequest) {
  if (!SECRET || SECRET.length < 8) {
    return NextResponse.json({ error: "غير مفعّل" }, { status: 503 });
  }
  const key = request.nextUrl.searchParams.get("key") ?? request.headers.get("x-system-key") ?? "";
  if (key !== SECRET) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
