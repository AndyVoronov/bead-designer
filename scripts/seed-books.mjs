/**
 * Seed script: migrates all hardcoded /books page content into the database.
 * Idempotent — safe to re-run (upserts by slug / key).
 *
 * Run on the server (where the DB is reachable):
 *   node scripts/seed-books.mjs
 *
 * Creates:
 *   - Category "Книги" (slug: knigi)
 *   - 16 Products (books) + ProductImage covers
 *   - 5 Reviews (categoryId = knigi)
 *   - 8 FAQ (scope: "books")
 *   - 4 DemoPair (try-demo before/after)
 *   - 17 LivePhoto (carousel)
 *   - ~25 SiteSettings keys (hero texts, prices, badges)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── 16 stories (from src/app/books/stories-data.ts) ──
const STORIES = [
  { slug: "imya-spasaet-korolevstvo", title: "«Имя спасает королевство»", description: "В день праздника дракон уносит волшебную корону принцессы. Чтобы спасти Королевство, нужно пройти через лабиринт белых роз, таинственный лес и пещеру с сокровищами. Получится ли вернуть корону до заката?", ageGroup: "0-3", pricePrint: 4590, discountPrint: 3890, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-spasaet-korolevstvo.webp", tag: "Приключения", homepageTag: "Новинка", audience: ["Мальчик","Девочка","Спутник"] },
  { slug: "imya-v-drevney-doline", title: "«Имя в древней долине»", description: "Среди леса и скал появляется загадочная пещера, ведущая в удивительный мир динозавров. За её проходом ждут шумные реки, огромный вулкан, древние ящеры и настоящее приключение, которое захочется пережить снова.", ageGroup: "3-5", pricePrint: 4490, discountPrint: 3990, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-v-drevney-doline.webp", tag: "Приключение", homepageTag: "Новинка", audience: ["Мальчик","Девочка"] },
  { slug: "imya-v-strane-snovideniy", title: "«Имя в Стране сновидений»", description: "Каждую ночь за далёкими горами открывается тайный проход. Туда нельзя добраться пешком или доехать на поезде. Но если закрыть глаза и произнести волшебные слова — начинается путешествие.", ageGroup: "0-3", pricePrint: 4490, discountPrint: 3890, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-v-strane-snovideniy.webp", tag: "Семейная", homepageTag: "Новинка", audience: ["Мальчик","Девочка","Мама","Папа","Бабушка","Дедушка"] },
  { slug: "imya-na-stantsii-bez-nomera", title: "«Имя на станции без номера»", description: "Поезд внезапно останавливается на станции без номера. Вдоль платформы стоят чемоданы с надписями «Когда-нибудь» и «Потом». Чтобы продолжить путь, каждому пассажиру нужно открыть свой. Но что делать, если внутри ничего нет?", ageGroup: "9-12", pricePrint: 4490, discountPrint: 3590, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-na-stantsii-bez-nomera.webp", tag: "Взрослеем", homepageTag: "Новинка", audience: ["Мальчик","Девочка","Спутник"] },
  { slug: "imya-kuda-delis-zvuki", title: "«Имя, куда делись звуки?»", description: "Однажды утром в деревне становится непривычно тихо. Не слышно ни птиц, ни зверей. Куда исчезли все звуки? Чтобы их вернуть, нужно обойти деревню и помочь каждому вспомнить свой голос.", ageGroup: "0-3", pricePrint: 4490, discountPrint: 3890, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-kuda-delis-zvuki.webp", tag: "", homepageTag: "Новинка", audience: ["Мальчик","Девочка"] },
  { slug: "imya-protiv-peny", title: "«Имя против пены»", description: "Привычное купание пошло не по плану, когда одна бутылочка вдруг упала в воду. Сначала мыльная пена заполнила ванну. Затем — комнату. А дальше — кто знает?", ageGroup: "0-3", pricePrint: 4490, discountPrint: 3890, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-protiv-peny.webp", tag: "Семейная", homepageTag: "Семейная", audience: ["Мальчик","Девочка","Мама","Папа","Бабушка","Дедушка"] },
  { slug: "imya-vverkh-tormashkami", title: "«Имя вверх тормашками»", description: "Если начать ходить на руках и смотреть на мир вверх ногами, то вещи приобретают самые неожиданные свойства. А ещё… это может оказаться очень полезным занятием! 🐾 История с питомцем или игрушкой.", ageGroup: "3-5", pricePrint: 4590, discountPrint: 3990, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-vverkh-tormashkami.webp", tag: "Непоседам", homepageTag: "", audience: ["Мальчик","Девочка","Спутник"] },
  { slug: "imya-igraet-v-pryatki", title: "«Имя играет в прятки»", description: "Огромная коробка из-под холодильника — отличное укрытие для пряток. Но стоит закрыть створки и включить фантазию — внутри появляется целый дом. Со звёздами на потолке!", ageGroup: "0-3", pricePrint: 4590, discountPrint: 3890, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-igraet-v-pryatki.webp", tag: "Популярная", homepageTag: "", audience: ["Мальчик","Девочка","Спутник"] },
  { slug: "imya-i-pismo-iz-budushchego", title: "«Имя и письмо из будущего»", description: "Что будет, если получить неизвестное письмо без марки с текстом, который просто так не прочитать? И можно ли изменить то, что ещё не случилось? История о маленьких поступках для большого будущего.", ageGroup: "9-12", pricePrint: 4490, discountPrint: 3590, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-i-pismo-iz-budushchego.webp", tag: "Взрослеем", homepageTag: "Новинка", audience: ["Мальчик","Девочка"] },
  { slug: "imya-v-ogromnom-mire", title: "«Имя в огромном мире»", description: "Шмель прилетел на подоконник и совсем выбился из сил. Что делать, если маленькому гостю нужна помощь? История о том, как один пушистый друг может показать, насколько огромным бывает мир — и как много в нём значит маленькая доброта.", ageGroup: "3-5", pricePrint: 4490, discountPrint: 3990, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-v-ogromnom-mire.webp", tag: "Эмпатам", homepageTag: "", audience: ["Мальчик","Девочка"] },
  { slug: "imya-i-solnechnyy-zaychik", title: "«Имя и солнечный зайчик»", description: "Солнечный зайчик скачет по комнате и совсем не даётся в руки. Вот бы поймать его и спрятать в карман… А когда за окном станет пасмурно — выпустить обратно. Но получится ли приручить такой быстрый лучик?", ageGroup: "0-3", pricePrint: 4590, discountPrint: 3890, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-i-solnechnyy-zaychik.webp", tag: "", homepageTag: "Популярная", audience: ["Мальчик","Девочка"] },
  { slug: "imya-vne-vremeni", title: "«Имя вне времени»", description: "Если часы вдруг встанут, появится уйма времени для самых разных занятий… Казалось бы, можно делать всё что угодно. Но как быстро это надоест?", ageGroup: "3-5", pricePrint: 4590, discountPrint: 3990, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-vne-vremeni.webp", tag: "Семейная", homepageTag: "Семейная", audience: ["Мальчик","Девочка","Мама","Папа","Бабушка","Дедушка"] },
  { slug: "imya-i-upryamaya-dver", title: "«Имя и упрямая дверь»", description: "Как странно, никто не входит и не выходит — а дверь хлопает! В этом нужно срочно разобраться… Вдруг в деле замешан гость-невидимка? 🐾 История с питомцем или игрушкой.", ageGroup: "6-8", pricePrint: 4490, discountPrint: 3590, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-i-upryamaya-dver.webp", tag: "Любопытным", homepageTag: "Новинка", audience: ["Мальчик","Девочка","Спутник"] },
  { slug: "imya-i-propavshie-zvezdy", title: "«Имя и пропавшие звезды»", description: "И куда пропали все звёзды? Ещё вчера их было сто, нет — двести! А сегодня и одну еле разглядишь… История о маленьком открытии.", ageGroup: "6-8", pricePrint: 4490, discountPrint: 3590, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-i-propavshie-zvezdy.webp", tag: "Любопытным", homepageTag: "Новинка", audience: ["Мальчик","Девочка"] },
  { slug: "imya-i-tayna-mayaka", title: "«Имя и тайна маяка»", description: "Стеклянная бутылка, странное слово и старый маяк, который давно не зажигается. Совпадение? Или кто-то действительно ждёт сигнала? Иногда один луч света может изменить больше, чем кажется.", ageGroup: "9-12", pricePrint: 4490, discountPrint: 3590, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-i-tayna-mayaka.webp", tag: "Взрослеем", homepageTag: "", audience: ["Мальчик","Девочка"] },
  { slug: "imya-i-gudyashchiy-dom", title: "«Имя и гудящий дом»", description: "В этом доме слышен странный звук. Каждый день в одно и то же время дом словно пытается сдвинуться с места… Или кто-то шумит в его подвале? Нужно разобраться.", ageGroup: "6-8", pricePrint: 4490, discountPrint: 3590, priceDigital: 1890, discountDigital: 1490, cover: "/books/covers/imya-i-gudyashchiy-dom.webp", tag: "Любопытным", homepageTag: "Новинка", audience: ["Мальчик","Девочка"] },
];

// ── 5 reviews (from BooksReviews.tsx) ──
const REVIEWS = [
  { authorName: "Екатерина С.", role: "Мама Алисы, 5 лет", text: "Это просто чудо! Алиса не могла поверить, что она главная героиня. Читаем каждый вечер перед сном, и каждый раз находим новые детали на картинках. Даже бабушка прослезилась." },
  { authorName: "Дмитрий В.", role: "Папа Миши, 4 года", text: "История не просто подставила имя — она реально учитывала внешность. Мы даже свитер такой же нашли для фотосессии! Ребёнок показывает книгу всем друзьям." },
  { authorName: "Анастасия П.", role: "Мама Софии, 6 лет", text: "Картинки яркие, сюжет увлекательный. Бабушки оценили — заказали ещё одну для племянника. Целая библиотека сказок у нас теперь." },
  { authorName: "Ольга М.", role: "Бабушка Артёма", text: "Внук показывает книгу всем гостям. Трогательно получилось. Уже заказали серию про космос — ждём не дождёмся!" },
  { authorName: "Марина К.", role: "Мама Даши, 3 года", text: "Дочка считает себя настоящей принцессой после этой книги. Качество иллюстраций поразило — как из настоящей детской книги из магазина!" },
];

// ── 8 FAQ (from BooksFaq.tsx, scope: "books") ──
const FAQ = [
  { question: "Как создаётся персонализированная книга?", answer: "Оформляя заказ, вы загружаете фотографии — одну или несколько в зависимости от количества героев в сюжете. Вместе с фотографией необходимо заполнить простую анкету, указав имя будущего персонажа, цвет глаз и волос.\n\nСервис предложит выбрать один из вариантов изображений для обложки и разворотов, так что вы сможете добавить в книгу именно те иллюстрации, которые вам больше понравятся.\n\nКак только изображения будут выбраны, вы получите электронную версию книги на указанную почту. Если во время оформления заказа вы не отказались от печатной версии, то макет будет автоматически отправлен в печать." },
  { question: "Безопасно ли загружать фотографии?", answer: "Абсолютно безопасно. Мы используем фотографии только для создания будущих персонажей. Все данные шифруются, фотографии не передаются третьим лицам и автоматически удаляются после завершения процесса." },
  { question: "Сколько времени занимает создание книги?", answer: "Процесс создания книги со всеми иллюстрациями занимает в среднем около 30 минут, если нет повышенной загруженности сервиса. Вы получите уведомление, когда книга будет готова к чтению." },
  { question: "Для какого возраста подходят истории?", answer: "Наши рассказы подходят для всей семьи, в том числе для детей до 12 лет. У каждой истории указан рекомендуемый возраст, чтобы текст был понятным и интересным для ребёнка. А также есть сюжеты, в которых участвуют сразу два персонажа." },
  { question: "Можно ли не печатать книгу?", answer: "Можно. В процессе оформления заказа вы сможете отказаться от печатной версии книги и оплатить только электронную версию." },
  { question: "Как работает кнопка «Попробовать»?", answer: "Кнопка «Попробовать» — это возможность увидеть демо-иллюстрацию с именем ребёнка и персонажем, созданным на основе его фото. Для получения полноценной книги в высоком качестве и без ограничений нужно оформить заказ, выбрав подходящий сюжет из каталога историй." },
  { question: "Можно ли редактировать готовую книгу?", answer: "Во время создания иллюстраций вы сможете выбирать понравившиеся изображения из нескольких вариантов для обложки и разворотов будущей книги. В текст истории будет интегрировано указанное вами имя. Изменить сюжет рассказа нельзя." },
  { question: "Когда я получу напечатанную книгу?", answer: "Если вы не отказались от печатной версии книги при оформлении заказа, то макет отправится в печать автоматически после того, как вы завершите выбор понравившихся иллюстраций. Печать и доставка обычно занимают от 5 до 10 дней в зависимости от транспортной компании и региона.\n\nЧтобы успеть к конкретной дате, оформляйте заказ заблаговременно — желательно за 14 дней." },
];

// ── 4 demo pairs (from BooksTryDemo.tsx) ──
const DEMO_PAIRS = [
  { photoUrl: "/books/transform/girl.webp", characterUrl: "/books/transform/girl-character.webp" },
  { photoUrl: "/books/transform/boy.webp", characterUrl: "/books/transform/boy-character.webp" },
  { photoUrl: "/books/transform/woman.webp", characterUrl: "/books/transform/woman-character.webp" },
  { photoUrl: "/books/transform/man.webp", characterUrl: "/books/transform/man-character.webp" },
];

// ── 17 live photos (from live-photos.ts) ──
const LIVE_PHOTOS = [
  "/books/live/img_1947.png", "/books/live/img_8621.jpg", "/books/live/photo_2026-04-11_16.20.57.jpeg",
  "/books/live/photo_2026-04-11_16.21.25.jpeg", "/books/live/photo_2026-05-11_21.09.45.jpeg",
  "/books/live/photo_2026-05-11_21.09.47.jpeg", "/books/live/photo_2026-05-11_22.48.35.jpeg",
  "/books/live/photo_2026-05-11_22.48.46.jpeg", "/books/live/img_2959.jpg", "/books/live/img_2958.jpg",
  "/books/live/photo_2026-05-11_22.48.57.jpeg", "/books/live/photo_2026-05-11_22.49.00.jpeg",
  "/books/live/img_1273.jpg", "/books/live/img_1267.png", "/books/live/photo_2026-05-11_22.49.43.jpeg",
  "/books/live/img_6976.jpg", "/books/live/img_6997.jpg",
];

// ── ~25 SiteSettings keys (texts, prices, badges) ──
const SETTINGS = {
  books_hero_badge: "Магия начинается здесь",
  books_hero_eyebrow: "Подарите",
  books_hero_title_1: "Приключение,",
  books_hero_title_2: "где главный герой",
  books_hero_title_3: "— ваш ребёнок",
  books_hero_subtext: "Создаем настоящие книги с вашим изображением и именем. Сначала покажем демо.",
  books_hero_video_url: "/books/hero.mov",
  books_marquee_text: "маленькие годы, большие воспоминания",
  books_whatyouget_badge: "Состав заказа",
  books_whatyouget_title: "Что вы получаете?",
  books_livebook_title: "Живая книга",
  books_livebook_spec: "Твёрдая обложка · от 20 страниц",
  books_livebook_price: "3 590 ₽",
  books_livebook_oldprice: "4 490 ₽",
  books_try_badge: "Демо-иллюстрация",
  books_try_title: "Загляните в сказку",
  books_try_subtext: "Посмотрите, как это работает — создайте первую иллюстрацию и решите, хотите ли целую сказку.",
  books_try_cta: "Попробовать демо",
  books_try_helper: "Займёт всего 2 минуты",
  books_reviews_badge: "Отзывы",
  books_reviews_eyebrow: "Что говорят",
  books_reviews_title: "Счастливые семьи",
  books_social_proof: "Уже 500+ счастливых историй",
  books_footer_tagline: "Персонализированные истории, где ребёнок — главный герой",
  books_footer_tagline_hand: "тепло о самом важном",
  books_footer_year: "2026",
};

async function main() {
  console.log("=== 1. Category «Книги» ===");
  const booksCategory = await prisma.category.upsert({
    where: { slug: "knigi" },
    update: { name: "Книги" },
    create: { name: "Книги", slug: "knigi", order: 999 },
  });
  console.log("  category id:", booksCategory.id);

  console.log("=== 2. Products (16 stories) ===");
  for (const s of STORIES) {
    const audienceStr = s.audience.join(", ");
    const discountPercent = Math.round((1 - s.discountPrint / s.pricePrint) * 100);
    const product = await prisma.product.upsert({
      where: { slug: s.slug },
      update: {
        name: s.title, shortDescription: s.description, basePrice: s.pricePrint,
        discountPercent, categoryId: booksCategory.id, status: "active",
        recommendedAge: s.ageGroup, audience: audienceStr, homepageTag: s.homepageTag,
        priceDigital: s.priceDigital, discountDigital: s.discountDigital,
      },
      create: {
        name: s.title, slug: s.slug, shortDescription: s.description, basePrice: s.pricePrint,
        discountPercent, categoryId: booksCategory.id, status: "active",
        recommendedAge: s.ageGroup, audience: audienceStr, homepageTag: s.homepageTag,
        priceDigital: s.priceDigital, discountDigital: s.discountDigital,
      },
    });
    // ensure cover image exists
    await prisma.productImage.upsert({
      where: { id: -1 }, // placeholder; use findFirst + create
      update: {},
      create: {},
    }).catch(() => {});
    const existingImg = await prisma.productImage.findFirst({ where: { productId: product.id, isMain: true } });
    if (!existingImg) {
      await prisma.productImage.create({ data: { productId: product.id, url: s.cover, isMain: true, order: 0 } });
    } else {
      await prisma.productImage.update({ where: { id: existingImg.id }, data: { url: s.cover } });
    }
  }
  const productCount = await prisma.product.count({ where: { categoryId: booksCategory.id } });
  console.log("  products in knigi:", productCount);

  console.log("=== 3. Reviews (5) ===");
  for (const r of REVIEWS) {
    const existing = await prisma.review.findFirst({ where: { authorName: r.authorName, categoryId: booksCategory.id } });
    if (existing) {
      await prisma.review.update({ where: { id: existing.id }, data: { rating: 5, text: r.text + " [" + r.role + "]", isApproved: true } });
    } else {
      await prisma.review.create({ data: { authorName: r.authorName, rating: 5, text: r.text + " [" + r.role + "]", categoryId: booksCategory.id, isApproved: true } });
    }
  }
  const reviewCount = await prisma.review.count({ where: { categoryId: booksCategory.id } });
  console.log("  reviews:", reviewCount);

  console.log("=== 4. FAQ (8, scope=books) ===");
  // clear existing books-scoped FAQ to avoid duplicates on re-run
  await prisma.productFaq.deleteMany({ where: { scope: "books" } });
  for (let i = 0; i < FAQ.length; i++) {
    await prisma.productFaq.create({ data: { ...FAQ[i], order: i, scope: "books" } });
  }
  console.log("  FAQ seeded:", FAQ.length);

  console.log("=== 5. DemoPairs (4) ===");
  await prisma.demoPair.deleteMany({});
  for (let i = 0; i < DEMO_PAIRS.length; i++) {
    await prisma.demoPair.create({ data: { ...DEMO_PAIRS[i], order: i, isActive: true } });
  }
  console.log("  DemoPairs seeded:", DEMO_PAIRS.length);

  console.log("=== 6. LivePhotos (17) ===");
  await prisma.livePhoto.deleteMany({});
  for (let i = 0; i < LIVE_PHOTOS.length; i++) {
    await prisma.livePhoto.create({ data: { url: LIVE_PHOTOS[i], order: i, isActive: true } });
  }
  console.log("  LivePhotos seeded:", LIVE_PHOTOS.length);

  console.log("=== 7. SiteSettings ===");
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.siteSettings.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log("  settings seeded:", Object.keys(SETTINGS).length);

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => { console.error("SEED FAILED:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
