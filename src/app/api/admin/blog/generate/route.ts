import { isAdmin } from "@/lib/admin-auth";
import { generateMeta, generateContent, extractAnimationParams, generateAndRenderAnimation, removeVideoPlaceholders } from "@/lib/ai-article";
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

  const encoder = new TextEncoder();

  // Safe enqueue — never throws even if controller is closed
  let controllerClosed = false;

  function send(data: Record<string, unknown>) {
    if (controllerClosed) return;
    try {
      const line = JSON.stringify(data) + "\n";
      controller.enqueue(encoder.encode(line));
    } catch {
      controllerClosed = true;
    }
  }

  const VIDEO_UPLOAD_DIR = process.env.VIDEO_UPLOAD_DIR || "/var/www/toydesigner/uploads/blog-animations";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        send({ step: "planning", progress: 5, message: "Анализирую тему..." });

        // Step 1: Metadata
        send({ step: "planning", progress: 10, message: "Запрашиваю у AI заголовок и структуру статьи..." });
        const meta = await generateMeta(topic, requirements);
        send({ step: "planning", progress: 20, message: `Заголовок: «${meta.title}»` });

        // Step 2: HTML content
        send({ step: "writing", progress: 25, message: "Пишу лид-абзац и основные секции..." });
        const content = await generateContent(topic, meta.title, requirements);
        send({ step: "writing", progress: 50, message: "Контент готов, оформляю статистику и советы..." });

        // Step 3: LLM-based video rendering with validation
        let heroVideoUrl: string | null = null;
        let midVideoUrl: string | null = null;
        let finalContent = content;

        send({ step: "animating", progress: 55, message: "Извлекаю параметры для видео-анимаций..." });

        try {
          const params = extractAnimationParams(meta.title, topic, content);
          const { mkdirSync } = await import("fs");
          const path = await import("path");
          const { randomUUID } = await import("crypto");

          mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true });

          const heroFilename = `hero-${randomUUID()}.mp4`;
          const midFilename = `mid-${randomUUID()}.mp4`;
          const heroPath = path.join(VIDEO_UPLOAD_DIR, heroFilename);
          const midPath = path.join(VIDEO_UPLOAD_DIR, midFilename);

          // Hero animation — LLM generate + test render + full render
          send({ step: "animating", progress: 58, message: "Генерирую hero-анимацию (AI + Remotion)..." });
          await generateAndRenderAnimation("hero", params, heroPath, (msg) => {
            send({ step: "animating", progress: 63, message: msg });
          });

          // Mid animation
          send({ step: "animating", progress: 72, message: "Генерирую mid-анимацию (AI + Remotion)..." });
          await generateAndRenderAnimation("mid", params, midPath, (msg) => {
            send({ step: "animating", progress: 75, message: msg });
          });

          heroVideoUrl = `/api/uploads/blog-animations/${heroFilename}`;
          midVideoUrl = `/api/uploads/blog-animations/${midFilename}`;

          finalContent = content.replace(/VIDEO_HERO_URL/g, heroVideoUrl);
          finalContent = finalContent.replace(/VIDEO_MID_URL/g, midVideoUrl);

          send({ step: "animating", progress: 85, message: "Оба видео готовы!" });
        } catch (err) {
          console.error("[article] Animation pipeline failed:", err);
          send({ step: "animating", progress: 70, message: "⚠️ Видео не создались, продолжаю без них..." });
          finalContent = removeVideoPlaceholders(finalContent);
        }

        // Step 4: Save to DB
        send({ step: "rendering", progress: 88, message: "Сохраняю статью в базу данных..." });

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
            tags: {
              create: (meta.tags || []).map((tag: string) => ({ tag })),
            },
            readTime,
            status: "published",
          },
        });

        console.log(`[article] Auto-published: id=${saved.id}, slug=${saved.slug}, videos=${!!heroVideoUrl}`);

        send({
          step: "done",
          progress: 100,
          message: "Статья опубликована!",
          slug: saved.slug,
          title: saved.title,
        });

        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Неизвестная ошибка";
        console.error("[article] Generation failed:", message, error);
        send({ step: "error", progress: 0, message });
        if (!controllerClosed) controller.close();
      }
    },
    cancel() {
      controllerClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
