/**
 * Seed script for the product catalog.
 *
 * Populates: Badge, Category, Product, ProductImage, ProductBadge, CompositeItem
 *
 * Usage: npx tsx prisma/seed-catalog.ts
 *
 * Idempotent — uses upsert patterns so it's safe to run repeatedly.
 * Uses plain PrismaClient (no adapter) since it runs outside Next.js.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Helpers ───────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Badge Definitions ────────────────────────────────────────────────────

const BADGES = [
  { label: "NEW", textColor: "#ffffff", bgColor: "#22c55e", order: 0 },
  { label: "SALE", textColor: "#ffffff", bgColor: "#ef4444", order: 1 },
  { label: "HIT", textColor: "#1a1a1a", bgColor: "#facc15", order: 2 },
  { label: "LIMITED", textColor: "#ffffff", bgColor: "#a855f7", order: 3 },
];

// ── Category Definitions ──────────────────────────────────────────────────

const CATEGORIES = [
  { name: "Держатели", slug: "derzhateli", order: 0 },
  { name: "Браслеты", slug: "braslety", order: 1 },
  { name: "Подвески", slug: "podveski", order: 2 },
  { name: "Вязаные игрушки", slug: "vyazanye-igrushki", order: 3 },
  { name: "Наборы", slug: "nabory", order: 4 },
  { name: "Аксессуары", slug: "aksessuary", order: 5 },
];

// ── Product Definitions ──────────────────────────────────────────────────

interface ProductDef {
  name: string;
  slug: string;
  shortDescription: string;
  description?: string;
  basePrice: number;
  discountPercent: number;
  type: "simple" | "composite";
  status: "draft" | "active";
  categorySlug: string;
  imageCount: number; // how many placeholder images
  badgeLabels?: string[]; // labels from BADGES to attach
  compositeChildren?: { childSlug: string; quantity: number }[];
}

const PRODUCTS: ProductDef[] = [
  // ── Simple products ──────────────────────────────────────────────────
  {
    name: "Держатель для телефона «Мишка»",
    slug: "derzhatel-telefon-mishka",
    shortDescription: "Мягкий вязаный держатель для телефона в виде мишки",
    description:
      "Очаровательный держатель для телефона, связанный вручную из гипоаллергенной пряжи. Устойчивая подушка в форме мишки надёжно удерживает устройство. Высота 12 см, подходит для большинства смартфонов.",
    basePrice: 1200,
    discountPercent: 0,
    type: "simple",
    status: "active",
    categorySlug: "derzhateli",
    imageCount: 3,
    badgeLabels: ["NEW"],
  },
  {
    name: "Браслет «Радужный»",
    slug: "braslet-raduzhnyj",
    shortDescription: "Яркий браслет из бисера с радужным узором",
    description:
      "Ручная работа из чешского бисера Preciosa. Длина 18 см, регулируемый застёжкой. Каждый браслет уникален.",
    basePrice: 800,
    discountPercent: 15,
    type: "simple",
    status: "active",
    categorySlug: "braslety",
    imageCount: 2,
    badgeLabels: ["SALE"],
  },
  {
    name: "Подвеска «Котёнок»",
    slug: "podveska-kotenok",
    shortDescription: "Миниатюрная подвеска-котёнок из бисера",
    description:
      "Крошечная подвеска в виде котёнка, сплетённая из японского бисера Miyuki. Высота 3 см. Подходит для браслетов, цепочек и сумок.",
    basePrice: 500,
    discountPercent: 0,
    type: "simple",
    status: "active",
    categorySlug: "podveski",
    imageCount: 2,
    badgeLabels: ["HIT"],
  },
  {
    name: "Вязаная игрушка «Зайчик»",
    slug: "vyazanaya-igrushka-zajchik",
    shortDescription: "Пушистый зайчик, связанный крючком",
    description:
      "Мягкая игрушка из плюшевой пряжи, связанная вручную. Высота 20 см. Наполнитель — холлофайбер, безопасен для детей. Можно стирать.",
    basePrice: 1800,
    discountPercent: 10,
    type: "simple",
    status: "active",
    categorySlug: "vyazanye-igrushki",
    imageCount: 4,
    badgeLabels: ["NEW"],
  },
  {
    name: "Аксессуар «Бант для волос»",
    slug: "aksessuar-bant-dlya-volos",
    shortDescription: "Объёмный вязаный бант на заколке",
    description:
      "Стильный бант из хлопковой пряжи на автоматической заколке. Диаметр 8 см. Лёгкий, не утяжеляет волосы.",
    basePrice: 600,
    discountPercent: 0,
    type: "simple",
    status: "draft",
    categorySlug: "aksessuary",
    imageCount: 2,
  },
  // ── Composite products (bundles) ─────────────────────────────────────
  {
    name: "Набор «Мишка и друг»",
    slug: "nabor-mishka-i-drug",
    shortDescription:
      "Комплект: держатель «Мишка» + подвеска «Котёнок» со скидкой",
    description:
      "Стильный комплект из держателя для телефона и брелока-подвески. При покупке набора вы экономите 10% по сравнению с отдельной покупкой.",
    basePrice: 1530, // 1200 + 500 − 10%
    discountPercent: 0,
    type: "composite",
    status: "active",
    categorySlug: "nabory",
    imageCount: 2,
    badgeLabels: ["NEW", "HIT"],
    compositeChildren: [
      { childSlug: "derzhatel-telefon-mishka", quantity: 1 },
      { childSlug: "podveska-kotenok", quantity: 1 },
    ],
  },
  {
    name: "Набор «Полный образ»",
    slug: "nabor-polnyj-obraz",
    shortDescription:
      "Браслет + подвеска + бант — всё для идеального комплекта",
    description:
      "Три аксессуара в одном наборе: радужный браслет, подвеска-котёнок и бант для волос. Идеально в подарок.",
    basePrice: 1632, // 800*0.85 + 500 + 600 − bundle discount
    discountPercent: 0,
    type: "composite",
    status: "active",
    categorySlug: "nabory",
    imageCount: 3,
    compositeChildren: [
      { childSlug: "braslet-raduzhnyj", quantity: 1 },
      { childSlug: "podveska-kotenok", quantity: 1 },
      { childSlug: "aksessuar-bant-dlya-volos", quantity: 1 },
    ],
  },
  {
    name: "Вязаная игрушка «Ёжик»",
    slug: "vyazanaya-igrushka-ezhik",
    shortDescription: "Милый ёжик с иголками из yarn-волос",
    description:
      "Очаровательный ёжик ручной работы. Головка и тельце из мягкой пряжи, иголки — из фактурной нити. Высота 15 см. Декоративная поделка, не игрушка для детей до 3 лет.",
    basePrice: 2200,
    discountPercent: 0,
    type: "simple",
    status: "active",
    categorySlug: "vyazanye-igrushki",
    imageCount: 3,
    badgeLabels: ["LIMITED"],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding catalog...\n");

  // 1. Badges
  console.log("── Badges ──");
  const badgeMap = new Map<string, number>(); // label → id
  for (const b of BADGES) {
    const badge = await prisma.badge.upsert({
      where: { label: b.label },
      update: { textColor: b.textColor, bgColor: b.bgColor, order: b.order },
      create: b,
    });
    badgeMap.set(badge.label, badge.id);
    console.log(`  ✓ ${badge.label}`);
  }

  // 2. Categories
  console.log("\n── Categories ──");
  const categoryMap = new Map<string, number>(); // slug → id
  for (const c of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, order: c.order },
      create: c,
    });
    categoryMap.set(c.slug, category.id);
    console.log(`  ✓ ${category.name} (${category.slug})`);
  }

  // 3. Products — simple first, then composite (needs child IDs)
  console.log("\n── Products ──");

  const simpleProducts = PRODUCTS.filter((p) => p.type === "simple");
  const compositeProducts = PRODUCTS.filter((p) => p.type === "composite");

  // Store slug → id mapping for composite references
  const productMap = new Map<string, number>();

  // Create simple products
  for (const p of simpleProducts) {
    const categoryId = categoryMap.get(p.categorySlug);
    if (!categoryId) {
      throw new Error(`Category "${p.categorySlug}" not found for product "${p.name}"`);
    }

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        shortDescription: p.shortDescription,
        description: p.description ?? null,
        basePrice: p.basePrice,
        discountPercent: p.discountPercent,
        status: p.status,
        categoryId,
      },
      create: {
        name: p.name,
        slug: p.slug,
        shortDescription: p.shortDescription,
        description: p.description ?? null,
        basePrice: p.basePrice,
        discountPercent: p.discountPercent,
        type: p.type,
        status: p.status,
        categoryId,
      },
    });

    productMap.set(p.slug, product.id);

    // Images — only create if none exist for this product
    const existingImages = await prisma.productImage.count({
      where: { productId: product.id },
    });

    if (existingImages === 0) {
      for (let i = 0; i < p.imageCount; i++) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: `/uploads/products/placeholder-${slugify(p.name)}-${i + 1}.jpg`,
            order: i,
            isMain: i === 0,
          },
        });
      }
    }

    // Badges — sync: connect the requested badges, disconnect any others
    const badgeIdsToConnect = (p.badgeLabels ?? [])
      .map((label) => badgeMap.get(label))
      .filter((id): id is number => id !== undefined);

    if (badgeIdsToConnect.length > 0) {
      // Delete existing badge connections and re-create
      await prisma.productBadge.deleteMany({
        where: { productId: product.id },
      });
      for (const badgeId of badgeIdsToConnect) {
        await prisma.productBadge.create({
          data: { productId: product.id, badgeId },
        });
      }
    }

    const discount = p.discountPercent > 0 ? ` (-${p.discountPercent}%)` : "";
    const badges = (p.badgeLabels ?? []).length > 0 ? ` [${p.badgeLabels!.join(", ")}]` : "";
    console.log(`  ✓ ${product.name} — ${p.basePrice}₽${discount} (${product.status})${badges}`);
  }

  // Create composite products
  for (const p of compositeProducts) {
    const categoryId = categoryMap.get(p.categorySlug);
    if (!categoryId) {
      throw new Error(`Category "${p.categorySlug}" not found for product "${p.name}"`);
    }

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        shortDescription: p.shortDescription,
        description: p.description ?? null,
        basePrice: p.basePrice,
        status: p.status,
        categoryId,
      },
      create: {
        name: p.name,
        slug: p.slug,
        shortDescription: p.shortDescription,
        description: p.description ?? null,
        basePrice: p.basePrice,
        type: p.type,
        status: p.status,
        categoryId,
      },
    });

    productMap.set(p.slug, product.id);

    // Images
    const existingImages = await prisma.productImage.count({
      where: { productId: product.id },
    });

    if (existingImages === 0) {
      for (let i = 0; i < p.imageCount; i++) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: `/uploads/products/placeholder-${slugify(p.name)}-${i + 1}.jpg`,
            order: i,
            isMain: i === 0,
          },
        });
      }
    }

    // Badges
    const badgeIdsToConnect = (p.badgeLabels ?? [])
      .map((label) => badgeMap.get(label))
      .filter((id): id is number => id !== undefined);

    if (badgeIdsToConnect.length > 0) {
      await prisma.productBadge.deleteMany({
        where: { productId: product.id },
      });
      for (const badgeId of badgeIdsToConnect) {
        await prisma.productBadge.create({
          data: { productId: product.id, badgeId },
        });
      }
    }

    // Composite items
    if (p.compositeChildren && p.compositeChildren.length > 0) {
      // Clear existing composite items for this parent
      await prisma.compositeItem.deleteMany({
        where: { parentId: product.id },
      });

      for (const child of p.compositeChildren) {
        const childId = productMap.get(child.childSlug);
        if (!childId) {
          throw new Error(
            `Child product "${child.childSlug}" not found for composite "${p.name}". ` +
              `Make sure simple products are seeded before composite ones.`
          );
        }

        await prisma.compositeItem.create({
          data: {
            parentId: product.id,
            childId,
            quantity: child.quantity,
          },
        });

        console.log(`    ↳ + ${child.childSlug} ×${child.quantity}`);
      }
    }

    const badges = (p.badgeLabels ?? []).length > 0 ? ` [${p.badgeLabels!.join(", ")}]` : "";
    console.log(`  ✓ ${product.name} — ${p.basePrice}₽ (composite, ${product.status})${badges}`);
  }

  // Summary
  const badgeCount = await prisma.badge.count();
  const categoryCount = await prisma.category.count();
  const productCount = await prisma.product.count();
  const imageCount = await prisma.productImage.count();
  const compositeCount = await prisma.compositeItem.count();

  console.log("\n── Summary ──");
  console.log(`  Badges:          ${badgeCount}`);
  console.log(`  Categories:      ${categoryCount}`);
  console.log(`  Products:        ${productCount} (simple: ${simpleProducts.length}, composite: ${compositeProducts.length})`);
  console.log(`  Product Images:  ${imageCount}`);
  console.log(`  Composite Items: ${compositeCount}`);
  console.log("\n✅ Catalog seeded successfully!");
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
