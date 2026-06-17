import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // Update/edit review
    if (action === "update") {
      const id = Number(body.id);
      if (!id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }

      const data: Record<string, unknown> = {};
      if (body.authorName !== undefined) data.authorName = String(body.authorName);
      if (body.rating !== undefined) data.rating = Number(body.rating);
      if (body.text !== undefined) data.text = String(body.text);
      if (body.isApproved !== undefined) data.isApproved = Boolean(body.isApproved);
      if (body.productId !== undefined) data.productId = body.productId === null ? null : Number(body.productId);
      if (body.categoryId !== undefined) data.categoryId = body.categoryId === null ? null : Number(body.categoryId);

      const review = await prisma.review.update({
        where: { id },
        data,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      return NextResponse.json({ updated: true, review });
    }

    // Approve / reject / delete
    const { id: rawId } = body;
    const id = Number(rawId);

    if (!id || !["approve", "reject", "delete"].includes(action)) {
      return NextResponse.json({ error: "id and action (approve/reject/delete/update) required" }, { status: 400 });
    }

    if (action === "delete") {
      await prisma.review.delete({ where: { id } });
      return NextResponse.json({ deleted: true });
    }

    await prisma.review.update({
      where: { id },
      data: { isApproved: action === "approve" },
    });

    return NextResponse.json({ [action === "approve" ? "approved" : "rejected"]: true });
  } catch (error) {
    console.error("Failed to process review:", error);
    return NextResponse.json({ error: "Failed to process review" }, { status: 500 });
  }
}
