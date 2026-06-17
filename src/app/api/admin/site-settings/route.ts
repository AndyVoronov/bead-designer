import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

const SETTINGS_SCHEMA: Record<string, { label: string; type: "text" | "longtext"; default: string }> = {
  address: { label: "Адрес", type: "text", default: "" },
  phone: { label: "Телефон", type: "text", default: "" },
  email: { label: "Email", type: "text", default: "" },
  working_hours: { label: "Часы работы", type: "text", default: "Пн-Пт 10:00–20:00" },
  telegram: { label: "Telegram", type: "text", default: "t.me/karinavoronova" },
  whatsapp: { label: "WhatsApp", type: "text", default: "" },
  yandex_maps_url: { label: "URL Яндекс.Карты", type: "text", default: "" },
  pickup_address: { label: "Адрес самовывоза", type: "text", default: "" },
  pickup_note: { label: "Примечание к самовывозу", type: "longtext", default: "" },
};

export async function GET() {
  const settings = await prisma.siteSettings.findMany();
  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });

  // Fill defaults
  for (const [key, schema] of Object.entries(SETTINGS_SCHEMA)) {
    if (!(key in map)) {
      map[key] = schema.default;
    }
  }

  return NextResponse.json({ settings: map, schema: SETTINGS_SCHEMA });
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: { key: string; value: string }[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (key in SETTINGS_SCHEMA && typeof value === "string") {
      updates.push({ key, value: value.slice(0, 2000) });
    }
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.siteSettings.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
