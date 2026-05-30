import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

// GET /api/product-faq?productId=X — public, returns FAQs for a product
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json([]);
  }

  const faqs = await prisma.productFaq.findMany({
    where: { productId: Number(productId) },
    orderBy: { order: "asc" },
    select: { id: true, question: true, answer: true },
  });

  return NextResponse.json(faqs);
}

// POST /api/admin/product-faq — admin: create/update FAQ
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, productId, question, answer, order } = body;

  if (!question || !answer) {
    return NextResponse.json({ error: "question and answer required" }, { status: 400 });
  }

  if (id) {
    // Update existing
    const faq = await prisma.productFaq.update({
      where: { id: Number(id) },
      data: { question, answer, order: order || 0 },
    });
    return NextResponse.json(faq);
  }

  // Create new
  const faq = await prisma.productFaq.create({
    data: {
      productId: productId ? Number(productId) : null,
      question,
      answer,
      order: order || 0,
    },
  });
  return NextResponse.json(faq, { status: 201 });
}

// DELETE /api/admin/product-faq?id=X
export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.productFaq.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
