import { isAdmin } from "@/lib/admin-auth";
import { generateMeta, generateContent, removeVideoPlaceholders } from "@/lib/ai-article";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function transliterateSlug(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_MAP[ch] || ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

// ─── In-memory job store (single admin, no persistence needed) ───
interface Job {
  status: "pending" | "done" | "error";
  message: string;
  progress: number;
  slug?: string;
  title?: string;
  id?: number;
  error?: string;
}

const jobs = new Map<string, Job>();

// ─── POST: start generation (returns immediately) ───
export async function POST(request: Request) {
  const authResult = await isAdmin(request as any);
  if (!authResult) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const topic = body?.topic?.trim();
  const requirements = body?.requirements?.trim() || undefined;

  if (!topic || topic.length < 3) {
    return Response.json({ step: "error", message: "Topic required" }, { status: 400 });
  }

  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(jobId, { status: "pending", message: "Запуск генерации...", progress: 5 });

  // Fire-and-forget: generation runs in background
  (async () => {
    const update = (partial: Partial<Job>) => {
      const j = jobs.get(jobId);
      if (j) jobs.set(jobId, { ...j, ...partial });
    };

    try {
      update({ message: "AI придумывает заголовок и структуру...", progress: 10 });
      const meta = await generateMeta(topic, requirements);

      update({ message: `Заголовок: «${meta.title}». Пишу контент...`, progress: 25 });
      let finalContent = await generateContent(topic, meta.title, requirements);

      update({ message: "Оформляю статью...", progress: 55 });
      finalContent = removeVideoPlaceholders(finalContent);

      update({ message: "Сохраняю в базу данных...", progress: 80 });

      const slug = transliterateSlug(meta.title).slice(0, 80);
      let finalSlug = slug;
      let counter = 1;
      while (true) {
        const existing = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
        if (!existing) break;
        finalSlug = `${slug}-${counter++}`;
      }

      const wordCount = finalContent.replace(/<[^>]+>/g, "").split(/\s+/).length;
      const readTime = Math.max(3, Math.ceil(wordCount / 250));

      const saved = await prisma.blogPost.create({
        data: {
          title: meta.title,
          slug: finalSlug,
          content: finalContent,
          excerpt: meta.excerpt,
          tags: { create: (meta.tags || []).map((tag: string) => ({ tag })) },
          readTime,
          status: "published",
        },
      });

      console.log(`[article] Published: id=${saved.id}, slug=${saved.slug}`);
      update({ status: "done", message: "Статья опубликована!", progress: 100, slug: saved.slug, title: saved.title, id: saved.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      console.error("[article] Job failed:", msg, err);
      update({ status: "error", message: "Ошибка генерации", error: msg, progress: 0 });
    }
  })();

  return Response.json({ jobId, message: "Генерация запущена" });
}

// ─── GET: poll job status ───
export async function GET(request: Request) {
  const authResult = await isAdmin(request as any);
  if (!authResult) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get("id");

  if (!jobId) {
    return Response.json({ step: "error", message: "Missing job id" }, { status: 400 });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return Response.json({ step: "error", message: "Job not found" }, { status: 404 });
  }

  // Auto-cleanup old jobs (keep for 5 min after completion)
  if (job.status === "done" || job.status === "error") {
    setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
  }

  return Response.json(job);
}
