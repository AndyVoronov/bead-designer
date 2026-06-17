const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const products = [
  {id:9,name:"Жираф"},{id:10,name:"Жираф из поргема"},{id:11,name:"Жирафное комбо"},
  {id:20,name:"Медвежонок в шапочке"},{id:21,name:"Лисичка"},
  {id:22,name:"Дракончик в платьице"},{id:23,name:"Малыш коала"},
  {id:24,name:"Малыш Жирафик"},{id:25,name:"Оленёнок-балерина"},
  {id:26,name:"Зайка в голубом"},{id:27,name:"Радужный Единорог"},
  {id:28,name:"Жирафик в шортиках"},{id:29,name:"Малыш Львёнок"},
  {id:30,name:"Дракончик в васильковом платье"},{id:31,name:"Черепашка"},
  {id:32,name:"Стич в шарфике"},{id:33,name:"Авокадо"},
  {id:34,name:"Пончик"},{id:35,name:"Арбузный микс"},
  {id:36,name:"Нежный лист"},{id:37,name:"Сладкий авокадо"},
  {id:38,name:"Закат"},{id:39,name:"Тыковка"},
  {id:40,name:"Пони на лугу"},{id:41,name:"Слоник на водопое"},
  {id:42,name:"Сочник"},{id:43,name:"Нежный бриз"},
  {id:44,name:"Дубовая роща"},{id:45,name:"Розовый пунш"},
  {id:46,name:"Морские глубины"},{id:47,name:"Дино на лугу"},
  {id:48,name:"Горячая пицца"},{id:49,name:"Сочность"},
  {id:50,name:"Ясное небо"},{id:51,name:"Стич прибыл"},
  {id:52,name:"Окольцованная нежность"},{id:53,name:"Человек-паук"},
  {id:54,name:"Молочный крем"},{id:55,name:"Малиновый узор"}
];

const angles = [
  "Как выбрать идеальную игрушку для развития малыша",
  "Почему эта игрушка — лучший подарок на первый день рождения",
  "Развивающие особенности и польза для мелкой моторики",
  "Отзыв мамы: как игрушка помогла в развитии ребёнка",
  "С какого возраста стоит покупать такую игрушку",
  "Чем эта игрушка отличается от аналогов на рынке",
  "Идеи для игр с игрушкой дома и на прогулке",
  "Как игрушка помогает развивать речь и воображение",
  "Безопасность материалов: на что обратить внимание",
  "Топ-5 причин выбрать эту игрушку ребёнку",
];

async function main() {
  const items = [];
  for (let i = 0; i < 100; i++) {
    const prod = products[i % products.length];
    const angle = angles[Math.floor(i / products.length) % angles.length];
    const topic = prod.name + ": " + angle;
    const offsetMs = (i + 1) * 90 * 60 * 1000;
    const scheduledAt = new Date(Date.now() + offsetMs);
    items.push({
      topic,
      productIds: JSON.stringify([prod.id]),
      scheduledAt,
      status: "pending"
    });
  }
  for (let b = 0; b < items.length; b += 10) {
    const batch = items.slice(b, b + 10);
    const created = await prisma.scheduledPost.createMany({ data: batch });
    console.log("Batch " + (b/10+1) + ": inserted " + created.count);
  }
  console.log("Done: 100 posts scheduled");
  
  // Show first and last
  const first = await prisma.scheduledPost.findFirst({ where: { status: "pending" }, orderBy: { scheduledAt: "asc" } });
  const last = await prisma.scheduledPost.findFirst({ where: { status: "pending" }, orderBy: { scheduledAt: "desc" } });
  console.log("First at:", first.scheduledAt.toISOString());
  console.log("Last at:", last.scheduledAt.toISOString());
  console.log("Total pending:", await prisma.scheduledPost.count({ where: { status: "pending" } }));
  
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
