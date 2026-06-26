import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Public keys only — no admin-internal settings
const PUBLIC_KEYS = [
  "address", "phone", "email", "working_hours",
  "telegram", "whatsapp", "yandex_maps_url",
  "pickup_address", "pickup_note",
];

export async function GET() {
  // Fetch explicit public keys PLUS any books_* keys (prefix match keeps it
  // future-proof as new books-section settings are added).
  const settings = await prisma.siteSettings.findMany({
    where: {
      OR: [
        { key: { in: PUBLIC_KEYS } },
        { key: { startsWith: "books_" } },
      ],
    },
  });

  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });

  return NextResponse.json(map);
}
