import sharp from "sharp";

/** الحد الأقصى لحجم الملف الوارد قبل المعالجة */
export const UPLOAD_MAX_INPUT_BYTES = 10 * 1024 * 1024;

/** الحد الأقصى لحجم الملف المحفوظ على السيرفر */
export const UPLOAD_MAX_STORED_BYTES = 2 * 1024 * 1024;

/** حد ملفات PDF (بدون ضغط — تُحفظ كما هي ضمن هذا الحد) */
export const UPLOAD_MAX_PDF_BYTES = 5 * 1024 * 1024;

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MAX_EDGE_PX = 1920;
const MAX_EDGE_STRONG_PX = 1280;

export type ProcessedUpload = {
  buffer: Buffer;
  ext: string;
  contentType: string;
  originalBytes: number;
  storedBytes: number;
  compressed: boolean;
};

async function imageToWebp(input: Buffer, maxEdge: number, quality: number): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer();
}

export async function processUploadBuffer(
  input: Buffer,
  mime: string
): Promise<ProcessedUpload> {
  const originalBytes = input.length;

  if (mime === "application/pdf") {
    if (input.length > UPLOAD_MAX_PDF_BYTES) {
      throw new Error("حجم ملف PDF أكبر من 5 ميجابايت — يُفضّل ضغطه خارجياً قبل الرفع");
    }
    return {
      buffer: input,
      ext: ".pdf",
      contentType: "application/pdf",
      originalBytes,
      storedBytes: input.length,
      compressed: false,
    };
  }

  if (!IMAGE_MIMES.has(mime)) {
    throw new Error("نوع الملف غير مدعوم (صورة jpeg/png/webp أو PDF)");
  }

  let webp = await imageToWebp(input, MAX_EDGE_PX, 82);

  if (webp.length > UPLOAD_MAX_STORED_BYTES) {
    webp = await imageToWebp(input, MAX_EDGE_STRONG_PX, 70);
  }

  if (webp.length > UPLOAD_MAX_STORED_BYTES) {
    throw new Error(
      "تعذّر ضغط الصورة ضمن الحد المسموح — جرّب صورة أصغر أو بدقة أقل"
    );
  }

  return {
    buffer: webp,
    ext: ".webp",
    contentType: "image/webp",
    originalBytes,
    storedBytes: webp.length,
    compressed: webp.length < originalBytes * 0.95,
  };
}
