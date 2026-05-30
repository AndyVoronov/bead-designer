/**
 * AI Article Generation Pipeline
 *
 * Uses OpenAI-compatible API (glm-5-turbo via z.ai) to generate
 * beautifully formatted blog articles with rich visual components.
 *
 * Pipeline:
 *   1) Metadata (title, excerpt, tags) — short LLM call
 *   2) HTML content (rich formatting with blog-* CSS classes) — main LLM call
 *   3) MP4 render via Remotion template animations on server
 */

const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.z.ai/api/coding/paas/v4";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "glm-5-turbo";
const REMOTION_DIR = process.env.REMOTION_DIR || "/tmp/remotion-articles";
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || "/root/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome";
const VIDEO_UPLOAD_DIR = process.env.VIDEO_UPLOAD_DIR || "/var/www/toydesigner/uploads/blog-animations";

/* ════════════════════════════════════════════════════════════
   LLM helpers
   ════════════════════════════════════════════════════════════ */

async function callLLM(
  messages: { role: string; content: string }[],
  maxTokens = 16384
): Promise<string> {
  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(300_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`LLM API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJSON<T>(raw: string): T | null {
  const fenceMatch = raw.match(/```(?:json)?\s*\n([\s\S]*?)```/);
  const text = fenceMatch ? fenceMatch[1].trim() : raw.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/* ════════════════════════════════════════════════════════════
   Step 1 — Article metadata
   ════════════════════════════════════════════════════════════ */

export interface ArticleMeta {
  title: string;
  excerpt: string;
  tags: string[];
}

export async function generateMeta(topic: string, requirements?: string): Promise<ArticleMeta> {
  const raw = await callLLM([
    {
      role: "system",
      content: `Ты — SEO-копирайтер для детского бренда «5 минут тишины». Возвращай ТОЛЬКО JSON, без markdown, без комментариев.`,
    },
    {
      role: "user",
      content: `Придумай заголовок и анонс для блог-статьи на тему: «${topic}»${requirements ? `\nДоп. требования: ${requirements}` : ""}

Верни JSON:
{
  "title": "Кликабельный заголовок 5-10 слов",
  "excerpt": "Анонс 2-3 предложения, интересная подводка",
  "tags": ["тег1", "тег2", "тег3", "тег4", "тег5"]
}`,
    },
  ], 1024);

  const parsed = extractJSON<ArticleMeta>(raw);
  return {
    title: parsed?.title?.trim() || "Без заголовка",
    excerpt: parsed?.excerpt?.trim() || "",
    tags: Array.isArray(parsed?.tags) ? parsed.tags.map(String).slice(0, 8) : [],
  };
}

/* ════════════════════════════════════════════════════════════
   Step 2 — HTML content
   ════════════════════════════════════════════════════════════ */

const CONTENT_SYSTEM_PROMPT = `Ты — профессиональный контент-продюсер для детского бренда «5 минут тишины».
Магазин продаёт вязанные игрушки, погремушки, бусы для прорезывания зубов, наборы.
Аудитория: молодые мамы 25-40 лет.

## ВАША ЕДИНСТВЕННАЯ ЗАДАЧА
Написать HTML-контент статьи. Отвечай ТОЛЬКО HTML-кодом. Никакого JSON, никаких \`\`\` блоков, никаких пояснений.

## КРИТИЧЕСКИ ВАЖНО — СТРУКТУРА
Ты ОБЯЗАН включить ВСЕ следующие секции в точном порядке:

### 1. Лид-абзац
<p class="blog-reveal">Крупный вступительный текст...</p>

### 2. Контент-секции (6-8 штук с <h2>)
Каждая: <h2>Заголовок</h2> + <p> + <ul>/<ol>
Используй <strong> для ключевых слов.

### 3. Timeline (ОБЯЗАТЕЛЬНО, минимум 4 пункта)
<div class="blog-timeline blog-reveal">
  <div class="blog-timeline-item">
    <div class="blog-timeline-time">0-3 месяца</div>
    <h3>Заголовок этапа</h3>
    <p>Описание</p>
  </div>
</div>

### 4. Статистика (ОБЯЗАТЕЛЬНО, минимум 4 цифры с data-target)
<div class="blog-stats blog-reveal">
  <div class="blog-stat-item">
    <div class="blog-stat-number" data-target="85" data-suffix="%">0</div>
    <div class="blog-stat-label">Подпись</div>
  </div>
</div>

### 5. Карточки-советы (ОБЯЗАТЕЛЬНО, минимум 4 штуки)
<div class="blog-tips-grid blog-reveal">
  <div class="blog-tip-card">
    <div class="blog-tip-icon">🧸</div>
    <h3>Заголовок</h3>
    <p>Краткий совет</p>
  </div>
</div>

### 6. Pull-quote (ОБЯЗАТЕЛЬНО)
<blockquote class="blog-pullquote blog-reveal">Цитата</blockquote>

### 7. Тёмная секция с мифами (ОБЯЗАТЕЛЬНО, минимум 3 мифа)
<div class="blog-dark-section blog-reveal">
  <h2>Мифы о [тема]</h2>
  <div class="blog-myth-item">
    <div class="blog-myth-question">❌ Миф: текст</div>
    <div class="blog-myth-answer">✅ Правда: текст</div>
  </div>
</div>

### 8. CTA секция (ОБЯЗАТЕЛЬНО)
<div class="blog-cta-section blog-reveal">
  <h2>Призыв к действию</h2>
  <p>Описание</p>
  <a href="/catalog" class="blog-cta-button">Перейти в каталог</a>
</div>

## ПРАВИЛА
- Стиль: тёплый, дружелюбный, экспертный без академичности
- Язык: русский, грамотный, с лёгким юмором
- Длина: 3000-5000 слов
- Факты: реальные данные, исследования
- Каждый блок оборачивай в blog-reveal
- Между секциями — пустые строки`;

export async function generateContent(topic: string, title: string, requirements?: string): Promise<string> {
  const raw = await callLLM(
    [
      { role: "system", content: CONTENT_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Напиши HTML-контент для статьи «${title}» на тему: ${topic}${requirements ? `\nДоп. требования: ${requirements}` : ""}

ПРИМЕР СТРУКТУРЫ (скопируй формат, подставь свой контент):

<p class="blog-reveal">Вступление...</p>

<h2>Заголовок секции</h2>
<p class="blog-reveal">Текст с <strong>выделениями</strong>...</p>
<ul class="blog-reveal">
  <li><strong>Пункт</strong> — описание</li>
</ul>

<blockquote class="blog-pullquote blog-reveal">Цитата</blockquote>

<h2>Этапы развития</h2>
<div class="blog-timeline blog-reveal">
  <div class="blog-timeline-item">
    <div class="blog-timeline-time">0-3 месяца</div>
    <h3>Первый этап</h3>
    <p>Описание</p>
  </div>
  <div class="blog-timeline-item">
    <div class="blog-timeline-time">3-6 месяцев</div>
    <h3>Второй этап</h3>
    <p>Описание</p>
  </div>
  <div class="blog-timeline-item">
    <div class="blog-timeline-time">6-12 месяцев</div>
    <h3>Третий этап</h3>
    <p>Описание</p>
  </div>
  <div class="blog-timeline-item">
    <div class="blog-timeline-time">1-2 года</div>
    <h3>Четвёртый этап</h3>
    <p>Описание</p>
  </div>
</div>

<div class="blog-stats blog-reveal">
  <div class="blog-stat-item">
    <div class="blog-stat-number" data-target="85" data-suffix="%">0</div>
    <div class="blog-stat-label">Показатель</div>
  </div>
  <div class="blog-stat-item">
    <div class="blog-stat-number" data-target="92" data-suffix="%">0</div>
    <div class="blog-stat-label">Показатель</div>
  </div>
  <div class="blog-stat-item">
    <div class="blog-stat-number" data-target="3" data-suffix="x">0</div>
    <div class="blog-stat-label">Показатель</div>
  </div>
  <div class="blog-stat-item">
    <div class="blog-stat-number" data-target="150" data-suffix="+">0</div>
    <div class="blog-stat-label">Показатель</div>
  </div>
</div>

<div class="blog-tips-grid blog-reveal">
  <div class="blog-tip-card">
    <div class="blog-tip-icon">🧸</div>
    <h3>Совет 1</h3>
    <p>Описание</p>
  </div>
  <div class="blog-tip-card">
    <div class="blog-tip-icon">👶</div>
    <h3>Совет 2</h3>
    <p>Описание</p>
  </div>
  <div class="blog-tip-card">
    <div class="blog-tip-icon">🧵</div>
    <h3>Совет 3</h3>
    <p>Описание</p>
  </div>
  <div class="blog-tip-card">
    <div class="blog-tip-icon">🛡️</div>
    <h3>Совет 4</h3>
    <p>Описание</p>
  </div>
</div>

<div class="blog-dark-section blog-reveal">
  <h2>Мифы</h2>
  <div class="blog-myth-item">
    <div class="blog-myth-question">❌ Миф: текст мифа</div>
    <div class="blog-myth-answer">✅ Правда: реальный факт</div>
  </div>
  <div class="blog-myth-item">
    <div class="blog-myth-question">❌ Миф: текст мифа</div>
    <div class="blog-myth-answer">✅ Правда: реальный факт</div>
  </div>
  <div class="blog-myth-item">
    <div class="blog-myth-question">❌ Миф: текст мифа</div>
    <div class="blog-myth-answer">✅ Правда: реальный факт</div>
  </div>
</div>

<div class="blog-cta-section blog-reveal">
  <h2>Готовы выбрать идеальную игрушку?</h2>
  <p>Описание</p>
  <a href="/catalog" class="blog-cta-button">Перейти в каталог</a>
</div>

Теперь напиши ПОЛНЫЙ контент — 3000-5000 слов, с реальными данными и исследованиями. Вставь 2 плейсхолдера для видео:

После первого <h2>:
<div class="blog-video-section blog-reveal"><video autoplay muted playsinline loop class="blog-animation-video"><source src="VIDEO_HERO_URL" type="video/mp4"></video></div>

Перед blog-dark-section:
<div class="blog-video-section blog-reveal"><video autoplay muted playsinline loop class="blog-animation-video"><source src="VIDEO_MID_URL" type="video/mp4"></video></div>`,
      },
    ],
    16384
  );

  return enhanceBlogHTML(cleanHTML(raw));
}

/* ════════════════════════════════════════════════════════════
   HTML Post-processor — adds blog-* CSS classes to plain HTML
   ════════════════════════════════════════════════════════════ */

function enhanceBlogHTML(html: string): string {
  const blogClassCount = (html.match(/class="[^"]*blog-(?!cta-button)/g) || []).length;
  if (blogClassCount > 5) {
    return html;
  }

  let result = html;

  result = result.replace(/<p>/g, '<p class="blog-reveal">');
  result = result.replace(/<ul>/g, '<ul class="blog-reveal">');
  result = result.replace(/<ol>/g, '<ol class="blog-reveal">');
  result = result.replace(/<blockquote>/g, '<blockquote class="blog-pullquote blog-reveal">');
  result = result.replace(/<blockquote\s+class="([^"]+)">/g, (_, cls: string) => `<blockquote class="${cls} blog-pullquote blog-reveal">`);

  const mythPattern = /<h2>([^<]*(?:миф|заблужден|заблуждени)[^<]*)<\/h2>([\s\S]*?)(?=<h2>|$)/gi;
  result = result.replace(mythPattern, (match: string, title: string, body: string) => {
    const paragraphs = body.match(/<p[^>]*>[\s\S]*?<\/p>/g) || [];
    const mythItems: string[] = [];
    let currentMyth = "";
    let currentAnswer = "";

    for (const p of paragraphs) {
      const text = p.replace(/<\/?p[^>]*>/g, "").trim();
      if (text.match(/❌|^[^❌✅]*миф:/i)) {
        if (currentMyth && currentAnswer) {
          mythItems.push(`<div class="blog-myth-item"><div class="blog-myth-question">❌ ${currentMyth.replace(/^[❌✅]\s*/, "").trim()}</div><div class="blog-myth-answer">✅ ${currentAnswer.replace(/^[❌✅]\s*/, "").trim()}</div></div>`);
        }
        currentMyth = text;
        currentAnswer = "";
      } else if (text.match(/✅|правда|факт/i) && currentMyth) {
        currentAnswer = text;
      }
    }
    if (currentMyth && currentAnswer) {
      mythItems.push(`<div class="blog-myth-item"><div class="blog-myth-question">❌ ${currentMyth.replace(/^[❌✅]\s*/, "").trim()}</div><div class="blog-myth-answer">✅ ${currentAnswer.replace(/^[❌✅]\s*/, "").trim()}</div></div>`);
    }
    if (mythItems.length === 0) return match;
    return `<div class="blog-dark-section blog-reveal">\n  <h2>${title}</h2>\n  ${mythItems.join("\n  ")}\n</div>`;
  });

  const timelinePattern = /<h2>([^<]*(?:этап|стад[ия]|по месяц|период)[^<]*)<\/h2>([\s\S]*?)(?=<h2>|<div class="blog-|$)/gi;
  result = result.replace(timelinePattern, (match: string, _title: string, body: string) => {
    const stageRegex = /<p[^>]*>(.*?)<\/p>\s*<h3>(.*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g;
    const items: string[] = [];
    let m: RegExpExecArray | null;

    while ((m = stageRegex.exec(body)) !== null) {
      const timeLabel = m[1].trim();
      const stageTitle = m[2].trim();
      const desc = m[3].trim();
      if (/(\d+[\s.,-]*\d*\s*(?:месяц|лет|год|недел)|[0-9]+[–\-][0-9]+\s*(?:месяц|лет|год|недел))/i.test(timeLabel)) {
        items.push(`<div class="blog-timeline-item"><div class="blog-timeline-time">${timeLabel}</div><h3>${stageTitle}</h3><p>${desc}</p></div>`);
      }
    }
    if (items.length < 3) return match;
    return `<div class="blog-timeline blog-reveal">\n  ${items.join("\n  ")}\n</div>`;
  });

  const tipsPattern = /<h2>([^<]*(?:совет|рекоменд|полезн|лайфхак|памятк|что может помочь|как улучшит)[^<]*)<\/h2>([\s\S]*?)(?=<h2>|<div class="blog-|$)/gi;
  result = result.replace(tipsPattern, (match: string, title: string, body: string) => {
    const listItems = body.match(/<li[^>]*>([\s\S]*?)<\/li>/g) || [];
    if (listItems.length < 3) return match;
    const icons = ["🧸", "👶", "🧵", "🛡️", "👂", "💡", "🌟", "🫧"];
    const cards = listItems.map((li, i) => {
      const text = li.replace(/<\/?li[^>]*>/g, "").replace(/<\/?strong>/g, "").trim();
      const boldMatch = text.match(/^(.+?)\s*[—–-]\s*/);
      const tipTitle = boldMatch ? boldMatch[1].trim() : `Совет ${i + 1}`;
      const tipText = boldMatch ? text.slice(boldMatch[0].length).trim() : text;
      return `<div class="blog-tip-card"><div class="blog-tip-icon">${icons[i % icons.length]}</div><h3>${tipTitle}</h3><p>${tipText}</p></div>`;
    });
    return `<div class="blog-tips-grid blog-reveal">\n  <h2>${title}</h2>\n  ${cards.join("\n  ")}\n</div>`;
  });

  const statData: { number: string; label: string }[] = [];
  const percentRegex = /(\d+)\s*%\s*([^<]*(?:родител|мам|дет|малыш|педиатр|врач|семь|исследован|опрос|статист|показал|отмечал|подтвержд)[^<]*)/gi;
  let pm: RegExpExecArray | null;
  while ((pm = percentRegex.exec(result)) !== null) {
    statData.push({ number: pm[1], label: pm[2].trim().slice(0, 120) });
  }

  if (statData.length >= 3) {
    const statItems = statData.slice(0, 6).map(s =>
      `<div class="blog-stat-item"><div class="blog-stat-number" data-target="${s.number}" data-suffix="%">0</div><div class="blog-stat-label">${s.label}</div></div>`
    );
    const statsBlock = `\n<div class="blog-stats blog-reveal">\n  ${statItems.join("\n  ")}\n</div>\n`;

    const h2Positions: number[] = [];
    let searchFrom = 0;
    while (h2Positions.length < 3) {
      const pos = result.indexOf("<h2>", searchFrom);
      if (pos === -1) break;
      h2Positions.push(pos);
      searchFrom = pos + 1;
    }
    if (h2Positions.length >= 2) {
      const insertBefore = h2Positions.length >= 3 ? h2Positions[2] : result.length;
      const section = result.slice(h2Positions[1], insertBefore);
      const lastPEnd = section.lastIndexOf("</p>");
      if (lastPEnd > 0) {
        const insertPos = h2Positions[1] + lastPEnd + 4;
        result = result.slice(0, insertPos) + statsBlock + result.slice(insertPos);
      } else {
        result = result.slice(0, h2Positions[1]) + statsBlock + result.slice(h2Positions[1]);
      }
    }
  }

  if (!/blog-cta-section/.test(result)) {
    const ctaH2 = result.match(/<h2>([^<]*(?:пока малыш|пусть рядом|игрушк|рядом будет|утеш|друж| вязан)[^<]*)<\/h2>([\s\S]*?)$/i);
    if (ctaH2) {
      const ctaText = ctaH2[2].replace(/<\/?p[^>]*>/g, " ").trim();
      result = result.slice(0, result.lastIndexOf(ctaH2[0])) +
        `<div class="blog-cta-section blog-reveal">\n  <h2>${ctaH2[1]}</h2>\n  <p class="blog-reveal">${ctaText}</p>\n  <a href="/catalog" class="blog-cta-button">Перейти в каталог</a>\n</div>`;
    }
  }

  return result;
}

function cleanHTML(raw: string): string {
  let html = raw.trim();
  html = html.replace(/^```(?:html)?\s*\n?/i, "");
  html = html.replace(/\n?```\s*$/i, "");
  html = html.replace(/^<p>\s*```json\s*/i, "");
  html = html.replace(/```\s*<\/p>\s*$/i, "");

  const contentFieldMatch = html.match(/^"content"\s*:\s*"([\s\S]+)$/);
  if (contentFieldMatch) {
    html = contentFieldMatch[1];
    html = html.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
    html = html.replace(/"$/, "");
  }

  html = html.replace(/^\s*"[^"]+"\s*:\s*"/, "");
  html = html.replace(/["},\s]+$/, "");

  if (!html.includes("<")) {
    const htmlMatch = raw.match(/<p[^>]*>[\s\S]+/);
    if (htmlMatch) html = htmlMatch[0];
  }

  return html.trim();
}

/* ════════════════════════════════════════════════════════════
   Step 3 — LLM-based Remotion animations with validation
   ════════════════════════════════════════════════════════════
   Uses structured prompts with reference code, iterative
   LLM validation, test render (10 frames), then full render.
   Based on remotion-llm-guide patterns.
   ════════════════════════════════════════════════════════════ */

interface AnimationParams {
  title: string;
  topic: string;
  emojis: string[];
  tips: string[];
  stats: { number: string; label: string }[];
}

export function extractAnimationParams(title: string, topic: string, content: string): AnimationParams {
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
  const allEmojis = [...new Set(content.match(emojiRegex) || [])];
  const emojis = allEmojis.filter(e => e.trim().length > 0).slice(0, 8);

  const tipPattern = /<div class="blog-tip-card">[\s\S]*?<div class="blog-tip-icon">([\s\S]*?)<\/div>[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/div>/g;
  const tips: string[] = [];
  let tipMatch: RegExpExecArray | null;
  while ((tipMatch = tipPattern.exec(content)) !== null && tips.length < 6) {
    tips.push(`${tipMatch[1].trim()} ${tipMatch[2].trim()}`);
  }

  const stats: { number: string; label: string }[] = [];
  const statPattern = /<div class="blog-stat-number"[^>]*data-target="(\d+)"[^>]*>(?:\d+)<\/div>\s*<div class="blog-stat-label">([\s\S]*?)<\/div>/g;
  let statMatch: RegExpExecArray | null;
  while ((statMatch = statPattern.exec(content)) !== null && stats.length < 4) {
    stats.push({ number: statMatch[1], label: statMatch[2].trim() });
  }

  return { title, topic, emojis, tips, stats };
}

/* ── Reference code for LLM prompts ── */

const ANIMATION_REFERENCE = `import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

const W = 1920;
const H = 1080;

// Sub-component pattern: each element gets its own useCurrentFrame()
const FloatingEmoji = ({ x, y, emoji, delay }: { x: number; y: number; emoji: string; delay: number }) => {
  const frame = useCurrentFrame();
  const wobble = Math.sin(frame * 0.12 + delay) * 6;
  const breathe = Math.sin(frame * 0.06 + delay) * 3;
  const entryY = interpolate(frame, [delay, delay + 25], [120, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <text key={emoji + delay} x={x} y={y + entryY + wobble + breathe} fontSize={56} textAnchor="middle" opacity={opacity}>
      {emoji}
    </text>
  );
};

const InfoCard = ({ x, y, icon, text, color, delay }: { x: number; y: number; icon: string; text: string; color: string; delay: number }) => {
  const frame = useCurrentFrame();
  const scale = spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 80, mass: 0.8 } });
  const slideX = interpolate(frame, [delay, delay + 20], [x < 960 ? -80 : 80, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const wobble = Math.sin(frame * 0.1 + delay) * 2;
  return (
    <g transform={\`translate(\${x + slideX}, \${y + wobble}) scale(\${scale})\`} opacity={opacity}>
      <rect x={-140} y={-35} width={280} height={70} rx={16} fill="white" stroke={color} strokeWidth={2} />
      <text x={-100} y={12} fontSize={32}>{icon}</text>
      <text x={-55} y={10} fontSize={18} fill="#374151">{text}</text>
    </g>
  );
};

// Main component — MUST use export default
const ExampleAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOpacity = interpolate(frame, [20, 40, 410, 430], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleScale = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 80, mass: 0.8 } });
  const titleY = interpolate(spring({ frame: frame - 20, fps, config: { damping: 14, stiffness: 90, mass: 0.7 } }), [0, 1], [60, 0]);
  const bgFade = interpolate(frame, [420, 445], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width: W, height: H, overflow: 'hidden', backgroundColor: '#fafafa' }}>
      <svg width={W} height={H} viewBox={\`0 0 \${W} \${H}\`}>
        <rect x={0} y={0} width={W} height={H} fill="#fafafa" opacity={bgFade} />
        <FloatingEmoji x={300} y={250} emoji="emoji1" delay={0} />
        <FloatingEmoji x={700} y={200} emoji="emoji2" delay={8} />
        <FloatingEmoji x={1200} y={300} emoji="emoji3" delay={16} />
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={72} fontWeight="bold" fill="#1a1a2e"
          opacity={titleOpacity} transform={\`translate(0, \${titleY}) scale(\${titleScale})\`}>
          Article Title Here
        </text>
        <line x1={W / 2 - 80} y1={H / 2 + 50} x2={W / 2 + 80} y2={H / 2 + 50}
          stroke="#a855f7" strokeWidth={4} strokeLinecap="round"
          opacity={interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
        <InfoCard x={400} y={800} icon="icon" text="Tip text" color="#a855f7" delay={100} />
        <InfoCard x={960} y={800} icon="icon" text="Tip text" color="#f43f5e" delay={120} />
      </svg>
    </div>
  );
};

export default ExampleAnimation;`;

/* ── Prompt builders ── */

function buildAnimationPrompt(
  type: "hero" | "mid",
  params: AnimationParams,
): { role: string; content: string }[] {
  const isHero = type === "hero";

  const scenario = isHero
    ? `Создай hero-анимацию (заставку) для блог-статьи детского магазина.

## Сценарий (15 секунд = 450 кадров @ 30fps, 5 фаз по 3 секунды)

Фаза 1 (кадры 0-90): Эмодзи из статьи появляются один за другим снизу с spring-анимацией. Каждый emoji занимает свою позицию на экране. Лёгкое покачивание у каждого.

Фаза 2 (кадры 90-180): Заголовок «${params.title}» появляется в центре с fade-in и spring-подъёмом. Под заголовком — градиентная разделительная линия (purple → rose). Под линией — подзаголовок «5 минут тишины — блог для заботливых родителей».

Фаза 3 (кадры 180-270): Декоративные SVG-элементы появляются: градиентные круги, линии, точки. Эмодзи плавно кружатся и покачиваются. Всё выглядит как красивая инфографика.

Фаза 4 (кадры 270-360): Добавляются мелкие частицы/звёздочки. Заголовок слегка «дышит». Общая композиция выглядит законченной.

Фаза 5 (кадры 360-450): Все элементы плавно fade-out и возвращаются в начальное состояние фазы 1 — бесшовная петля.

Доступные эмодзи: ${params.emojis.join(", ")}
Заголовок: ${params.title}`
    : `Создай mid-article анимацию для блог-статьи. Визуализация статистики и советов.

## Данные из статьи:
Статистика: ${params.stats.map(s => `${s.number}% — ${s.label}`).join("; ") || "нет данных"}
Советы: ${params.tips.slice(0, 4).join("; ") || "нет данных"}
Эмодзи: ${params.emojis.slice(0, 6).join(", ")}

## Сценарий (15 секунд = 450 кадров @ 30fps, 5 фаз по 3 секунды)

Фаза 1 (кадры 0-90): Появляется заголовок «Цифры и факты» с fade-in. Декоративные emoji-элементы появляются по краям экрана.

Фаза 2 (кадры 90-180): Карточки статистики появляются одна за другой. Каждая — белый rounded-rect с большой цветной цифрой (анимированный счётчик от 0 до целевого значения) и подписью. Весёлые микро-анимации.

Фаза 3 (кадры 180-270): Карточки советов появляются в сетке 2x2 (или 1x3). Каждая — rounded-rect с emoji-иконкой и текстом. Slide-in слева/справа по очереди.

Фаза 4 (кадры 270-360): Все элементы слегка «дышат». Декоративные частицы между элементами. Карточки мерцают.

Фаза 5 (кадры 360-450): Все элементы fade-out, возвращаясь в начальное состояние — бесшовная петля.`;

  const userContent = `
## Задача
${scenario}

## Технические требования (СТРОГО)
- export default — обязательно
- 1920x1080, 450 кадров @ 30fps
- Использовать ТОЛЬКО: useCurrentFrame, useVideoConfig, interpolate, spring из 'remotion'
- Белый фон (#fafafa)
- Цветной мультяшный стиль, палитра: #a855f7 (purple), #f43f5e (rose), #ec4899 (pink), #8b5cf6 (violet), #06b6d4 (cyan), #10b981 (green), #eab308 (yellow), #f97316 (orange)

## Запрещено
- extrapolateRight: 'loop' — НЕ работает в Remotion! Используй Math.sin для зацикливания
- Дублирующиеся импорты
- Незакрытые JSX теги (все <rect>, <circle>, <line> должны быть self-closing)
- HTML <div> для графики — используй SVG <rect>, <circle>, <ellipse>, <path>, <line>, <text>, <g>
- <img> — только SVG-примитивы
- CSS @keyframes — только JS через interpolate() и spring()
- interpolate с УБЫВАЮЩИМ inputRange — inputRange всегда строго возрастающий
- useCurrentFrame() вне компонента

## Обязательные паттерны
1. Каждый визуальный элемент = отдельный подкомпонент с собственным useCurrentFrame()
2. Микро-анимации (Math.sin) в КАЖДОМ подкомпоненте — wobble, breathe, fidget
3. 5 фаз по 90 кадров: появление → развитие → кульминация → финал → петля
4. Фаза 5 (кадры 360-450): всё плавно fade-out для бесшовной петли
5. Все animate-эффекты через interpolate() с extrapolateLeft/extrapolateRight: 'clamp'

## Рабочий референс-код (следуй этой структуре):
${ANIMATION_REFERENCE}

Выведи ТОЛЬКО TSX-код компонента. Без markdown fences, без пояснений, без комментариев с описанием. Только рабочий код.`;

  return [
    {
      role: "system",
      content: "Ты — эксперт по Remotion-анимациям. Создаёшь уникальные, красивые анимации для блог-статей детского магазина. Всегда следуй техническому specs и референс-коду. Выводишь ТОЛЬКО валидный TSX без markdown.",
    },
    { role: "user", content: userContent },
  ];
}

/* ── TSX extraction ── */

function extractTsxCode(text: string): string {
  let code = text.trim();
  code = code.replace(/^```(?:tsx|jsx|typescript)?\s*\n?/i, "");
  code = code.replace(/\n?```\s*$/i, "");

  const importMatch = code.indexOf("import ");
  if (importMatch !== -1) {
    let depth = 0;
    let lastBrace = -1;
    for (let i = importMatch; i < code.length; i++) {
      if (code[i] === "{") depth++;
      if (code[i] === "}") { depth--; if (depth === 0) lastBrace = i; }
    }
    if (lastBrace > importMatch) {
      code = code.slice(importMatch, lastBrace + 1).trim();
    }
  }

  return code;
}

/* ── File writing helpers ── */

function writeAnimationFiles(componentName: string, tsxCode: string): void {
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");

  fs.mkdirSync(path.join(REMOTION_DIR, "src"), { recursive: true });
  fs.writeFileSync(path.join(REMOTION_DIR, "src", `${componentName}.tsx`), tsxCode);

  const rootCode = `import { Composition, registerRoot } from "remotion";
import ${componentName} from "./${componentName}";

export const RemotionRoot = () => {
  return (
    <Composition
      id="${componentName}"
      component={${componentName}}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionRoot);`;

  fs.writeFileSync(path.join(REMOTION_DIR, "src", "Root.tsx"), rootCode);
}

/* ── Main animation generation with validation ── */

export async function generateAndRenderAnimation(
  type: "hero" | "mid",
  params: AnimationParams,
  outputPath: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const { execSync } = await import("child_process");
  const { mkdirSync } = await import("fs");
  const path = await import("path");

  const componentName = type === "hero" ? "HeroAnimation" : "MidAnimation";
  const label = type === "hero" ? "hero" : "mid";

  mkdirSync(REMOTION_DIR, { recursive: true });
  mkdirSync(path.join(REMOTION_DIR, "src"), { recursive: true });
  mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true });

  // Step 1: Generate TSX via LLM
  onProgress?.(`Запрашиваю у AI ${label}-анимацию...`);
  const messages = buildAnimationPrompt(type, params);
  let tsxCode = await callLLM(messages, 4096);
  tsxCode = extractTsxCode(tsxCode);

  if (tsxCode.length < 100) {
    throw new Error(`LLM returned too little code for ${label} animation (${tsxCode.length} chars)`);
  }

  // Step 2: Iterative validation + test render (up to 3 attempts)
  const MAX_ATTEMPTS = 3;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    writeAnimationFiles(componentName, tsxCode);

    onProgress?.(
      attempt === 0
        ? `Проверяю ${label}-анимацию (тестовый рендер 10 кадров)...`
        : `Исправляю ${label}-анимацию (попытка ${attempt + 2}/${MAX_ATTEMPTS + 1})...`
    );

    try {
      // Test render: first 10 frames only (~15-20 seconds)
      execSync(
        `cd ${REMOTION_DIR} && npx remotion render src/Root.tsx ${componentName} /tmp/test-${label}.mp4 --browser-executable-path ${CHROMIUM_PATH} --frames=0-10 2>&1`,
        { timeout: 60_000, stdio: "pipe" }
      );

      // Test passed! Full render
      onProgress?.(`${label === "hero" ? "Hero" : "Mid"} OK! Рендерю полное видео (~1-2 мин)...`);
      execSync(
        `cd ${REMOTION_DIR} && npx remotion render src/Root.tsx ${componentName} ${outputPath} --browser-executable-path ${CHROMIUM_PATH} 2>&1`,
        { timeout: 180_000, stdio: "pipe" }
      );

      console.log(`[article] ${label} video rendered: ${outputPath}`);
      return;
    } catch (err: any) {
      const stderr = (err.stderr?.toString() || err.stdout?.toString() || err.message || "").slice(0, 1500);
      console.error(`[article] ${label} render attempt ${attempt + 1} failed:`, stderr.slice(0, 300));

      if (attempt >= MAX_ATTEMPTS - 1) {
        throw new Error(`${label} animation failed after ${MAX_ATTEMPTS} attempts`);
      }

      // Ask LLM to fix
      onProgress?.(`AI исправляет ошибки в ${label}-анимации...`);
      try {
        const fixResponse = await callLLM([
          {
            role: "system",
            content: "Ты — эксперт Remotion. Исправь синтаксические ошибки в TSX коде. Выведи ТОЛЬКО исправленный TSX-код, без markdown fences и пояснений.",
          },
          {
            role: "user",
            content: `Ошибки при рендере:\n${stderr.slice(0, 1000)}\n\nИсправь этот код:\n\n${tsxCode.slice(0, 6000)}`,
          },
        ], 4096);

        tsxCode = extractTsxCode(fixResponse);

        if (tsxCode.length < 100) {
          throw new Error(`LLM fix returned too little code (${tsxCode.length} chars)`);
        }
      } catch (fixErr) {
        console.error(`[article] LLM fix call failed for ${label}:`, fixErr);
        throw new Error(`${label} animation fix failed: LLM call error`);
      }
    }
  }
}

export function removeVideoPlaceholders(content: string): string {
  return content.replace(
    /<div class="blog-video-section[^"]*">\s*<video[^>]*>\s*<source[^>]*>\s*<\/video>\s*<\/div>\s*/gi,
    ""
  );
}

/* ════════════════════════════════════════════════════════════
   Main entry point
   ════════════════════════════════════════════════════════════ */

export async function generateArticle(
  topic: string,
  requirements?: string,
  renderVideos = true
): Promise<{
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  readTime: number;
  heroVideoUrl: string | null;
  midVideoUrl: string | null;
}> {
  // Step 1: metadata
  const meta = await generateMeta(topic, requirements);

  // Step 2: HTML content
  let content = await generateContent(topic, meta.title, requirements);

  // Step 3: LLM-based video rendering
  let heroVideoUrl: string | null = null;
  let midVideoUrl: string | null = null;

  if (renderVideos) {
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

      await generateAndRenderAnimation("hero", params, heroPath, (msg) => {
        console.log(`[article] ${msg}`);
      });

      await generateAndRenderAnimation("mid", params, midPath, (msg) => {
        console.log(`[article] ${msg}`);
      });

      heroVideoUrl = `/api/uploads/blog-animations/${heroFilename}`;
      midVideoUrl = `/api/uploads/blog-animations/${midFilename}`;

      content = content.replace(/VIDEO_HERO_URL/g, heroVideoUrl);
      content = content.replace(/VIDEO_MID_URL/g, midVideoUrl);

      console.log("[article] Videos rendered successfully");
    } catch (err) {
      console.error("[article] Animation pipeline failed:", err);
      content = removeVideoPlaceholders(content);
    }
  } else {
    content = removeVideoPlaceholders(content);
  }

  const wordCount = content.replace(/<[^>]+>/g, "").split(/\s+/).length;
  const readTime = Math.max(3, Math.ceil(wordCount / 250));

  return {
    ...meta,
    content,
    readTime,
    heroVideoUrl,
    midVideoUrl,
  };
}
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;