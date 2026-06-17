import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id);

  if (isNaN(postId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const existing = await prisma.scheduledPost.findUnique({ where: { id: postId } });
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status !== "pending") {
    return Response.json({ error: "Можно редактировать только задачи в статусе 'Ожидает'" }, { status: 400 });
  }

  const body = await request.json();
  const { topic, additionalRequirements, scheduledAt } = body;

  const data: Record<string, string | Date> = {};
  if (topic !== undefined) data.topic = topic;
  if (additionalRequirements !== undefined) data.additionalRequirements = additionalRequirements;
  if (scheduledAt !== undefined) {
    data.scheduledAt = new Date(scheduledAt);
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "Нет данных для обновления" }, { status: 400 });
  }

  const updated = await prisma.scheduledPost.update({
    where: { id: postId },
    data,
  });

  return Response.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id);

  if (isNaN(postId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  await prisma.scheduledPost.delete({ where: { id: postId } });
  console.log(`[schedule] Deleted: id=${postId}`);

  return Response.json({ success: true });
}
