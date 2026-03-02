import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path: pathSegments } = await params;
  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json({ error: "ملف غير محدد" }, { status: 400 });
  }
  const filename = pathSegments.join("/");
  if (filename.includes("..") || /[<>:"|?*]/.test(filename)) {
    return NextResponse.json({ error: "مسار غير صالح" }, { status: 400 });
  }
  try {
    const filepath = path.join(UPLOAD_DIR, filename);
    const relative = path.relative(UPLOAD_DIR, path.resolve(UPLOAD_DIR, filename));
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return NextResponse.json({ error: "مسار غير صالح" }, { status: 400 });
    }
    const buffer = await readFile(filepath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
  }
}
