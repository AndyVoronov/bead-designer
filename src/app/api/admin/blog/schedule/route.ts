import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── POST: create scheduled post ───
export async function POST(request: Request) {
  const authResult = await isAdmin(request as any);
  if (!authResult) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const topic = body?.topic?.trim();
  const additionalRequirements = body?.additionalRequirements?.trim() || null;
  const productIdsRaw = body?.productIds;
  const scheduledAtStr = body?.scheduledAt;

  if (!topic || topic.length < 3) {
    return Response.json({ error: "Topic required (min 3 chars)" }, { status: 400 });
  }

  if (!scheduledAtStr) {
    return Response.json({ error: "scheduledAt is required" }, { status: 400 });
  }

  const scheduledAt = new Date(scheduledAtStr);
  if (isNaN(scheduledAt.getTime())) {
    return Response.json({ error: "Invalid scheduledAt date" }, { status: 400 });
  }

  const productIds = Array.isArray(productIdsRaw)
    ? JSON.stringify(productIdsRaw)
    : null;

  const scheduled = await prisma.scheduledPost.create({
    data: {
      topic,
      additionalRequirements,
      productIds,
      scheduledAt,
    },
  });

  console.log(`[schedule] Created: id=${scheduled.id}, topic="${topic}", at=${scheduledAt.toISOString()}`);

  return Response.json({ success: true, id: scheduled.id });
}

// ─── GET: list scheduled posts ───
export async function GET(request: Request) {
  const authResult = await isAdmin(request as any);
  if (!authResult) {
    return new Response("Unauthorized", { status: 401 });
  }

  const posts = await prisma.scheduledPost.findMany({
    orderBy: { scheduledAt: "desc" },
    include: {
      article: {
        select: { id: true, title: true, slug: true },
      },
    },
  });

  return Response.json(posts);
}

// ─── DELETE: cancel scheduled post ───
export async function DELETE(request: Request) {
  const authResult = await isAdmin(request as any);
  if (!authResult) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body?.id;

  if (!id || typeof id !== "number") {
    return Response.json({ error: "Valid id is required" }, { status: 400 });
  }

  const post = await prisma.scheduledPost.findUnique({ where: { id } });

  if (!post) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (post.status !== "pending") {
    return Response.json(
      { error: `Cannot cancel post with status "${post.status}"` },
      { status: 400 }
    );
  }

  await prisma.scheduledPost.delete({ where: { id } });

  console.log(`[schedule] Cancelled: id=${id}`);

  return Response.json({ success: true });
}
