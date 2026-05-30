import { NextRequest } from "next/server";

const SECRET = process.env.SYSTEM_SETUP_SECRET;

export function checkSystemKey(
  request: NextRequest,
  body?: { systemKey?: string }
): boolean {
  if (!SECRET || SECRET.length < 8) return false;
  const fromHeader = request.headers.get("x-system-key");
  const fromBody = body?.systemKey;
  return fromHeader === SECRET || fromBody === SECRET;
}
