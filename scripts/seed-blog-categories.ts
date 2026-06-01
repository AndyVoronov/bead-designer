/**
 * Seed script: Create 20 blog categories for «5 минут тишины».
 *
 * Usage:  npx tsx scripts/seed-blog-categories.ts
 *
 * Uses upsert (create if not exists, update if exists).
 * Stores the emoji as the first character of `description` so the UI can parse it.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: "Развитие малыша", slug: "razvitie-malysha", emoji: "🧒" },
  { name: "Первые шаги", slug: "pervye-shagi", emoji: "👶" },
  { name: "Питание и прикорм", slug: "pitanie-i-prikorm", emoji: "🍼" },
  { name: "Сон и режим", slug: "son-i-rezhim", emoji: "😴" },
  { name: "Игры и развлечения", slug: "igry-i-razvlecheniya", emoji: "🎮" },
  { name: "Здоровье малыша", slug: "zdorovie-malysha", emoji: "🩺" },
  { name: "Безопасность", slug: "bezopasnost", emoji: "🛡️" },
  { name: "Психология и воспитание", slug: "psikhologiya-i-vospitanie", emoji: "🧠" },
  { name: "Прорезывание зубов", slug: "protezivanie-zubov", emoji: "🦷" },
  { name: "Творчество и рукоделие", slug: "tvorchestvo-i-rukodelie", emoji: "🎨" },
  { name: "Подготовка к родам", slug: "podgotovka-k-rodam", emoji: "🤰" },
  { name: "Уход за малышом", slug: "ukhod-za-malyshom", emoji: "🧴" },
  { name: "Выбор игрушек", slug: "vybor-igrush", emoji: "🧸" },
  { name: "Прогулки и путешествия", slug: "progulki-i-puteshestviya", emoji: "🚶" },
  { name: "Развивающие занятия", slug: "razvivayushchie-zanyatiya", emoji: "📚" },
  { name: "Одежда и гардероб", slug: "odezhda-i-garderob", emoji: "👗" },
  { name: "Рецепты для малышей", slug: "recepty-dlya-malyshei", emoji: "🥣" },
  { name: "Мамин отдых", slug: "mamin-otdykh", emoji: "☕" },
  { name: "Готовимся к школе", slug: "gotovimsya-k-shkole", emoji: "🏫" },
  { name: "Подарки и идеи", slug: "podarki-i-idei", emoji: "🎁" },
] as const;

async function main() {
  console.log(`🌱 Seeding ${CATEGORIES.length} blog categories...\n`);

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    const result = await prisma.blogCategory.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.emoji,
        order: i + 1,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.emoji,
        order: i + 1,
      },
    });

    console.log(`  ${i + 1}. ${cat.emoji} ${cat.name} (${cat.slug}) — upserted (id=${result.id})`);
  }

  console.log("\n✅ Done! All blog categories are up to date.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
