import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { isAdmin } from "@/lib/admin-auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? process.env.UPLOAD_DIR.replace(/\/(products|blog)$/, "/books")
  : "/opt/bead-designer/uploads/books";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
]);
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/webm",
]);

const ALLOWED_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const ALLOWED_VIDEO_EXT = new Set([".mp4", ".mov", ".webm"]);

const MAX_IMAGE = 10 * 1024 * 1024; // 10MB for images
const MAX_VIDEO = 50 * 1024 * 1024; // 50MB for video

// POST /api/admin/books/upload — upload an image or video for the /books page
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Файл не предоставлен" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Недопустимый тип. Разрешены: jpg, png, gif, webp, mp4, mov, webm" },
        { status: 400 }
      );
    }

    const ext = extname(file.name).toLowerCase() || `.${file.type.split("/")[1]}`;
    const extOk = isImage ? ALLOWED_IMAGE_EXT.has(ext) : ALLOWED_VIDEO_EXT.has(ext);
    if (!extOk) {
      return NextResponse.json({ error: "Недопустимое расширение файла" }, { status: 400 });
    }

    const maxSize = isImage ? MAX_IMAGE : MAX_VIDEO;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Размер файла не должен превышать ${isImage ? "10" : "50"} МБ` },
        { status: 400 }
      );
    }

    const filename = `${crypto.randomUUID()}${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(UPLOAD_DIR, filename), buffer);

    return NextResponse.json(
      { url: `/uploads/books/${filename}` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to upload books media:", error);
    return NextResponse.json({ error: "Не удалось загрузить файл" }, { status: 500 });
  }
}
