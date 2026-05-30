import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { isAdmin } from "@/lib/admin-auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? process.env.UPLOAD_DIR.replace(/\/products$/, "/blog")
  : "/opt/bead-designer/uploads/blog";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/admin/blog/upload — upload a blog image
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Файл не предоставлен" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Недопустимый тип файла. Разрешены: jpg, png, gif, webp" },
        { status: 400 }
      );
    }

    // Validate extension matches allowed types
    const ext = extname(file.name).toLowerCase() || `.${file.type.split("/")[1]}`;
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: "Недопустимое расширение файла" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Размер файла не должен превышать 5 МБ" },
        { status: 400 }
      );
    }

    // Generate cryptographically secure unique filename
    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    return NextResponse.json(
      { url: `/uploads/blog/${filename}` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to upload blog image:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить изображение" },
      { status: 500 }
    );
  }
}
