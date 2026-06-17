import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.blogPost.update({ where: { id: 37 }, data: { categoryId: 4 } });
  console.log("Post 37 → pitanie-i-prikorm (id=4)");

  await prisma.blogPost.update({ where: { id: 36 }, data: { categoryId: 4 } });
  console.log("Post 36 → pitanie-i-prikorm (id=4)");

  await prisma.blogPost.update({ where: { id: 35 }, data: { categoryId: 6 } });
  console.log("Post 35 → igry-i-razvlecheniya (id=6)");

  const posts = await prisma.blogPost.findMany({
    where: { id: { in: [35, 36, 37] } },
    select: { id: true, title: true, category: { select: { name: true } } },
  });
  console.log("\nVerified:");
  for (const p of posts) {
    console.log(`  ${p.id}: ${p.title} → ${p.category?.name || "NO CATEGORY"}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
