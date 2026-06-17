import { NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import { join, extname } from "path";
import { stat } from "fs/promises";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/opt/bead-designer/uploads/products";

function getMimeType(ext: string): string {
  const types: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };
  return types[ext.toLowerCase()] || "application/octet-stream";
}

// GET /api/uploads/products/[...path] — serve uploaded files
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const filename = path.join("/");

    // Security: prevent directory traversal
    if (filename.includes("..") || filename.startsWith("/")) {
      return NextResponse.json({ error: "Недопустимый путь" }, { status: 400 });
    }

    const filepath = join(UPLOAD_DIR, filename);

    try {
      await stat(filepath);
    } catch {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }

    const ext = extname(filename);
    const contentType = getMimeType(ext);

    const fileStream = createReadStream(filepath);
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(fileStream as unknown as BodyInit, { headers });
  } catch (error) {
    console.error("Failed to serve file:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить файл" },
      { status: 500 }
    );
  }
}
