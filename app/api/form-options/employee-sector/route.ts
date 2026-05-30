import { NextResponse } from "next/server";
import { requireSuperAdminOrAdminOrReception } from "@/lib/api-auth";
import { listEmployeeSectorOptions } from "@/lib/employee-sector-options";

/** قائمة خيارات نوع التوظيف — للنماذج (استقبال، أدمن، …) */
export async function GET() {
  const auth = await requireSuperAdminOrAdminOrReception();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const options = await listEmployeeSectorOptions(false);
  return NextResponse.json(options);
}
