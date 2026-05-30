import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Public keys only — no admin-internal settings
const PUBLIC_KEYS = [
  "address", "phone", "email", "working_hours",
  "telegram", "whatsapp", "yandex_maps_url",
  "pickup_address", "pickup_note",
];

export async function GET() {
  const settings = await prisma.siteSettings.findMany({
    where: { key: { in: PUBLIC_KEYS } },
  });

  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });

  return NextResponse.json(map);
}
