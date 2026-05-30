import { NextResponse } from "next/server";
import { requireSuperAdminOrAdminOrReception } from "@/lib/api-auth";
import { listTransactionTypeOptions } from "@/lib/transaction-type-options";

export async function GET() {
  const auth = await requireSuperAdminOrAdminOrReception();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const options = await listTransactionTypeOptions(false);
  return NextResponse.json(options);
}
