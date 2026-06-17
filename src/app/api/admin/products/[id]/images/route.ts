import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/opt/bead-designer/uploads/products";

function getUploadDir() {
  return UPLOAD_DIR;
}

function getExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext || "jpg";
}

function getMimeType(ext: string): string {
  const types: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  return types[ext] || "application/octet-stream";
}

// POST /api/admin/products/[id]/images — upload image
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const productId = Number(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Неверный ID товара" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Файл не предоставлен" },
        { status: 400 }
      );
    }

    // Check file type
    const ext = getExtension(file.name);
    const allowedExts = ["jpg", "jpeg", "png", "gif", "webp"];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: "Неподдерживаемый формат файла" },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Файл слишком большой (макс. 10 МБ)" },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });

    // Generate filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const filename = `${productId}_${timestamp}_${random}.${ext}`;
    const filepath = join(uploadDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Check if this is the first image for the product
    const imageCount = await prisma.productImage.count({
      where: { productId },
    });

    const imageUrl = `/uploads/products/${filename}`;

    // Create ProductImage record
    const productImage = await prisma.productImage.create({
      data: {
        productId,
        url: imageUrl,
        order: imageCount,
        isMain: imageCount === 0,
      },
    });

    return NextResponse.json(productImage, { status: 201 });
  } catch (error) {
    console.error("Failed to upload image:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить изображение" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/products/[id]/images — set main image
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const productId = Number(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Неверный ID товара" }, { status: 400 });
    }

    const body = await request.json();
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json({ error: "imageId обязателен" }, { status: 400 });
    }

    const targetImageId = Number(imageId);

    // Get all images for this product
    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { order: "asc" },
    });

    const targetIdx = images.findIndex((img) => img.id === targetImageId);
    if (targetIdx === -1) {
      return NextResponse.json(
        { error: "Изображение не найдено" },
        { status: 404 }
      );
    }

    // Reorder: selected image gets order=0, others get sequential > 0
    await prisma.$transaction(
      images.map((img, i) => {
        const newOrder = i === targetIdx ? 0 : i + 1;
        return prisma.productImage.update({
          where: { id: img.id },
          data: { order: newOrder },
        });
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to set main image:", error);
    return NextResponse.json(
      { error: "Не удалось изменить главное изображение" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id]/images — delete specific image by imageId
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const productId = Number(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Неверный ID товара" }, { status: 400 });
    }

    const body = await request.json();
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json(
        { error: "imageId обязателен" },
        { status: 400 }
      );
    }

    const image = await prisma.productImage.findFirst({
      where: { id: Number(imageId), productId },
    });

    if (!image) {
      return NextResponse.json(
        { error: "Изображение не найдено" },
        { status: 404 }
      );
    }

    const wasMain = image.isMain;

    await prisma.productImage.delete({
      where: { id: image.id },
    });

    // If the deleted image was main, set next image as main
    if (wasMain) {
      const nextImage = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: { order: "asc" },
      });
      if (nextImage) {
        await prisma.productImage.update({
          where: { id: nextImage.id },
          data: { isMain: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete image:", error);
    return NextResponse.json(
      { error: "Не удалось удалить изображение" },
      { status: 500 }
    );
  }
}
