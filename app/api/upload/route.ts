import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  processUploadBuffer,
  UPLOAD_MAX_INPUT_BYTES,
} from "@/lib/compress-upload";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "لم يتم رفع ملف" }, { status: 400 });
    }
    if (file.size > UPLOAD_MAX_INPUT_BYTES) {
      return NextResponse.json(
        { error: "حجم الملف أكبر من 10 ميجابايت" },
        { status: 400 }
      );
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم (صورة jpeg/png/webp أو PDF)" },
        { status: 400 }
      );
    }

    const input = Buffer.from(await file.arrayBuffer());
    let processed;
    try {
      processed = await processUploadBuffer(input, file.type);
    } catch (err) {
      const message = err instanceof Error ? err.message : "فشل معالجة الملف";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${processed.ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    await writeFile(filepath, processed.buffer);

    return NextResponse.json({
      url: `/uploads/${filename}`,
      size: processed.storedBytes,
      originalSize: processed.originalBytes,
      compressed: processed.compressed,
      contentType: processed.contentType,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "فشل رفع الملف" }, { status: 500 });
  }
}
