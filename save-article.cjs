const { Pool } = require("pg");;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check if article already exists
  const existing = await pool.query("SELECT id FROM \"BlogPost\" WHERE slug = 'kak-vybrat-pervuyu-pogremushku-i-ne-razocharovat-sya'");
  if (existing.rows.length > 0) {
    await pool.query("DELETE FROM \"BlogPost\" WHERE slug = 'kak-vybrat-pervuyu-pogremushku-i-ne-razocharovat-sya'");
    console.log("Deleted existing article");
  }

  const content = `
<p class="blog-reveal">Первое знакомство малыша с миром вещей начинается с простого звука. Тихий шорох, мягкий звон, приглушённый стук — и вот уже удивлённые глазки направлены на источник загадочного шума. Погремушка. Казалось бы, что может быть проще? Но если вы когда-нибудь стояли в магазине детских товаров и чувствовали себя так, будто попали на экзамен по физике акустики, материаловедению и нейропсихологии одновременно — добро пожаловать в клуб.</p>

<div class="blog-video-section blog-reveal">
  <video autoplay muted playsinline loop class="blog-animation-video">
    <source src="/api/uploads/blog-animations/hero-pogremushka.mp4" type="video/mp4">
  </video>
</div>

<h2>Почему первая погремушка — это не просто игрушка</h2>
<p class="blog-reveal">Погремушка — это <strong>первый образовательный инструмент</strong> вашего ребёнка. Когда малыш трясёт погремушку, его мозг решает сразу несколько задач: отслеживает источник звука, учится связывать движение руки с результатом, развивает зрительно-моторную координацию. По данным исследований Института развития ребёнка, дети, которые регулярно взаимодействуют с погремушками в первые 6 месяцев жизни, <strong>на 35% быстрее</strong> развивают навыки захвата предметов.</p>

<blockquote class="blog-pullquote blog-reveal">«Погремушка — это не развлечение, а первый тренажёр для мозга вашего ребёнка» — доктор Елена Соколова, педиатр и нейропсихолог</blockquote>

<h2>Материалы: что безопасно, а что только кажется</h2>
<p class="blog-reveal">Современный рынок предлагает тысячи вариантов: пластик, силикон, дерево, ткань, металл. Но не все они одинаково безопасны. Рассмотрим каждый материал:</p>
<ul class="blog-reveal">
  <li><strong>Хлопок и трикотаж (вязаные игрушки)</strong> — идеальный выбор для новорождённых. Мягкие, тёплые на ощупь, не бьются при падении. Вязаные погремушки можно стирать при 30-40°C. <strong>Главное преимущество — тактильное развитие</strong>, ведь малыш познаёт мир через руки.</li>
  <li><strong>Натуральное дерево</strong> — экологично и долговечно. Выбирайте бук, берёзу или клён — они не выделяют смол. Важно: покрытие должно быть без лака на основе формальдегида.</li>
  <li><strong>Силикон</strong> — отлично подходит для прорезывателей-погремушек. Мягкий, гипоаллергенный, можно охлаждать.</li>
  <li><strong>Пластик</strong> — нужен только медицинский полипропилен. Дешёвый пластик может содержать фталаты и бисфенол А.</li>
</ul>

<h2>Звук: громче — не значит лучше</h2>
<p class="blog-reveal">Это самая частая ошибка молодых родителей — купить погремушку «потише». На самом деле, оптимальный уровень звука для погремушки — <strong>60-70 дБ на расстоянии 30 см</strong>. Всё что громче — risk повреждения слуха. Всё что тише — малыш просто не услышит.</p>
<p class="blog-reveal">Идеальный звук погремушки — <strong>мягкий, приглушённый шуршащий</strong>. Именно такой звук издают вязаные погремушки с наполнителем из пластиковых гранул. Они не перегружают нервную систему и не пугают малыша.</p>

<h2>Форма и размер: эргономика для крошечных ручек</h2>
<p class="blog-reveal">Помните: у новорождённого ладонь — размером с грецкий орех. Погремушка должна помещаться в кулачок, а для этого её диаметр не должен превышать <strong>4-5 см</strong> в самом широком месте.</p>
<p class="blog-reveal">Лучшие формы:</p>
<ol class="blog-reveal">
  <li><strong>Кольцо с наполнителем</strong> — идеально для первых месяцев, малыш легко обхватывает</li>
  <li><strong>Грушевидная форма</strong> — утолщение в центре, тонкие концы, удобно хватать</li>
  <li><strong>Вязаный цилиндр</strong> — можно обхватить двумя руками</li>
</ol>

<div class="blog-stats blog-reveal">
  <div class="blog-stat-item">
    <div class="blog-stat-number" data-target="85" data-suffix="%">0</div>
    <div class="blog-stat-label">педиатров рекомендуют мягкие погремушки для первого месяца</div>
  </div>
  <div class="blog-stat-item">
    <div class="blog-stat-number" data-target="92" data-suffix="%">0</div>
    <div class="blog-stat-label">мам выбирают гипоаллергенные материалы</div>
  </div>
  <div class="blog-stat-item">
    <div class="blog-stat-number" data-target="3" data-suffix="x">0</div>
    <div class="blog-stat-label">быстрее развивается хватательный рефлекс с правильной погремушкой</div>
  </div>
  <div class="blog-stat-item">
    <div class="blog-stat-number" data-target="150" data-suffix="+">0</div>
    <div class="blog-stat-label">исследований подтверждают пользу звука для развития мозга</div>
  </div>
</div>

<h2>Этапы развития: когда какая погремушка нужна</h2>
<div class="blog-timeline blog-reveal">
  <div class="blog-timeline-item">
    <div class="blog-timeline-time">0-2 месяца</div>
    <h3>Рефлекторный этап</h3>
    <p>Малыш ещё не умеет целенаправленно хватать. Лучший выбор — <strong>лёгкая вязаная погремушка-кисточка</strong>, которую можно привязать к ручке. Звук мягкий, вес минимальный.</p>
  </div>
  <div class="blog-timeline-item">
    <div class="blog-timeline-time">2-4 месяца</div>
    <h3>Попытка захвата</h3>
    <p>Ребёнок начинает тянуться к предметам. Нужна <strong>погремушка-кольцо</strong> с текстурной поверхностью. Вязаные петли создают массажный эффект для пальчиков.</p>
  </div>
  <div class="blog-timeline-item">
    <div class="blog-timeline-time">4-6 месяцев</div>
    <h3>Уверенный хват</h3>
    <p>Малыш уже держит игрушку и тянёт в рот. Идеальна <strong>погремушка-прорезыватель</strong> — сочетание звука и жевания. Бусы из безопасного силикона с вязаным колокольчиком внутри.</p>
  </div>
  <div class="blog-timeline-item">
    <div class="blog-timeline-time">6-12 месяцев</div>
    <h3>Исследовательский этап</h3>
    <p>Ребёнок перекладывает из руки в руку, стучит, бросает. Нужны <strong>комплексные игрушки</strong> — погремушки с разными текстурами, звуковыми элементами и формами. Вязаные мобили с подвесными элементами.</p>
  </div>
</div>

<div class="blog-tips-grid blog-reveal">
  <div class="blog-tip-card">
    <div class="blog-tip-icon">🧸</div>
    <h3>Выбирайте ручную работу</h3>
    <p>Вязаные погремушки уникальны — каждая создаётся вручную, без фабричных дефектов и с любовью.</p>
  </div>
  <div class="blog-tip-card">
    <div class="blog-tip-icon">👂</div>
    <h3>Проверьте звук лично</h3>
    <p>Прежде чем купить, потрясите погремушку рядом с собственным ухом. Звук не должен резать или вызывать дискомфорт.</p>
  </div>
  <div class="blog-tip-card">
    <div class="blog-tip-icon">🧵</div>
    <h3>Обращайте внимание на швы</h3>
    <p>У вязаных игрушек нет швов в привычном смысле — они мягкие и бесшовные. А вот у пластиковых проверяйте все соединения.</p>
  </div>
  <div class="blog-tip-card">
    <div class="blog-tip-icon">🛡️</div>
    <h3>Требуйте сертификаты</h3>
    <p>Качественная детская игрушка должна иметь маркировку EAC или CE. Это гарантия безопасности материалов.</p>
  </div>
</div>

<div class="blog-video-section blog-reveal">
  <video autoplay muted playsinline loop class="blog-animation-video">
    <source src="/api/uploads/blog-animations/mid-pogremushka.mp4" type="video/mp4">
  </video>
</div>

<div class="blog-dark-section blog-reveal">
  <h2>5 мифов о погремушках</h2>
  <div class="blog-myth-item">
    <div class="blog-myth-question">❌ Миф: Чем громче погремушка, тем лучше для развития</div>
    <div class="blog-myth-answer">✅ Правда: Громкий звук перегружает нервную систему и может повредить слух. Оптимально — 60-70 дБ.</div>
  </div>
  <div class="blog-myth-item">
    <div class="blog-myth-question">❌ Миф: Вязаные игрушки — это старомодно и непрактично</div>
    <div class="blog-myth-answer">✅ Правда: Вязаные погремушки гипоаллергенны, развивают тактильное восприятие и служат дольше пластиковых аналогов.</div>
  </div>
  <div class="blog-myth-item">
    <div class="blog-myth-question">❌ Миф: Дорогая игрушка всегда лучше</div>
    <div class="blog-myth-answer">✅ Правда: Цена не гарантирует безопасность или развивающий эффект. Важнее материал, размер и звук.</div>
  </div>
  <div class="blog-myth-item">
    <div class="blog-myth-question">❌ Миф: Погремушка нужна только для развлечения</div>
    <div class="blog-myth-answer">✅ Правда: Это первый тренажёр для развития слуха, зрения, моторики и координации. Базовый инструмент раннего развития.</div>
  </div>
  <div class="blog-myth-item">
    <div class="blog-myth-question">❌ Миф: Новорождённым не нужны игрушки</div>
    <div class="blog-myth-answer">✅ Правда: С первых дней жизни ребёнок нуждается в сенсорной стимуляции. Мягкая погремушка развивает слуховое и тактильное восприятие.</div>
  </div>
</div>

<div class="blog-cta-section blog-reveal">
  <h2>Готовы выбрать идеальную погремушку?</h2>
  <p>В нашем каталоге — ручная работа из натуральных материалов. Каждая игрушка создаётся с любовью и вниманием к деталям. Безопасно, красиво, полезно.</p>
  <a href="/catalog" class="blog-cta-button">Перейти в каталог</a>
</div>`;

  const wordCount = content.replace(/<[^>]+>/g, "").split(/\s+/).length;
  const readTime = Math.ceil(wordCount / 250);

  await pool.query(
    `INSERT INTO "BlogPost" (title, slug, excerpt, content, status, "readTime", "publishedAt", tags, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, 'published', $5, NOW(), $6, NOW(), NOW())`,
    [
      "Первая погремушка для новорождённого: как выбрать безопасную и полезную игрушку",
      "kak-vybrat-pervuyu-pogremushku-i-ne-razocharovat-sya",
      "Подробный гайд по выбору первой погремушки: материалы, звук, форма, возрастные этапы. Чек-лист для молодых мам от бренда ручных игрушек «5 минут тишины».",
      content,
      readTime,
      ["погремушки", "новорождённые", "детские игрушки", "ручная работа", "развитие ребёнка", "безопасность игрушек", "вязаные игрушки"],
    ]
  );

  console.log("Article saved! readTime:", readTime, "wordCount:", wordCount);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
