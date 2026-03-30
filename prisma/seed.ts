/**
 * Seed script for Prisma — populates the Template table with 8 pre-made designs.
 *
 * Usage: npx prisma db seed
 *
 * This script uses real catalog bead IDs to generate design codes via encodeDesign,
 * producing valid round-trippable codes that the frontend can decode and load.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { CATALOG_BEADS, getCatalogBead } from "../src/data/catalogBeads";
import { catalogBeadToBeadState } from "../src/lib/catalogUtils";
import { encodeDesign } from "../src/lib/serialization";

const adapter = new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL! }));
const prisma = new PrismaClient({ adapter });

/**
 * Each template definition: name, and the catalog bead IDs that make up the design.
 * Using real IDs from the catalog spanning different materials for variety.
 */
const templates: { name: string; beads: string[] }[] = [
  {
    name: "Розовая классика",
    beads: [
      "cb-026", "cb-032", "cb-036", "cb-026", "cb-042", "cb-032",
      "cb-036", "cb-026", "cb-045", "cb-032", "cb-026", "cb-036",
    ],
  },
  {
    name: "Натуральное дерево",
    beads: [
      "cb-001", "cb-003", "cb-005", "cb-001", "cb-003", "cb-009",
      "cb-001", "cb-003", "cb-005", "cb-012", "cb-001", "cb-003",
    ],
  },
  {
    name: "Весенняя свежесть",
    beads: [
      "cb-028", "cb-034", "cb-027", "cb-028", "cb-053", "cb-028",
      "cb-034", "cb-043", "cb-028", "cb-034", "cb-027", "cb-028",
    ],
  },
  {
    name: "Яркий микс",
    beads: [
      "cb-076", "cb-078", "cb-077", "cb-079", "cb-080", "cb-076",
      "cb-078", "cb-077", "cb-079", "cb-080", "cb-076", "cb-078",
    ],
  },
  {
    name: "Лавандовый сон",
    beads: [
      "cb-029", "cb-041", "cb-035", "cb-029", "cb-050", "cb-029",
      "cb-041", "cb-035", "cb-029", "cb-050", "cb-029", "cb-041",
    ],
  },
  {
    name: "Тёплый уют",
    beads: [
      "cb-051", "cb-052", "cb-055", "cb-051", "cb-069", "cb-051",
      "cb-052", "cb-055", "cb-059", "cb-051", "cb-052", "cb-055",
    ],
  },
  {
    name: "Морской бриз",
    beads: [
      "cb-027", "cb-046", "cb-086", "cb-027", "cb-046", "cb-033",
      "cb-027", "cb-046", "cb-086", "cb-027", "cb-033", "cb-046",
    ],
  },
  {
    name: "Лесная сказка",
    beads: [
      "cb-002", "cb-004", "cb-010", "cb-057", "cb-002", "cb-004",
      "cb-057", "cb-011", "cb-002", "cb-004", "cb-010", "cb-057",
    ],
  },
];

async function main() {
  console.log("Seeding templates...");

  // Validate all bead IDs before inserting
  for (const tmpl of templates) {
    const invalid = tmpl.beads.filter((id) => !getCatalogBead(id));
    if (invalid.length > 0) {
      throw new Error(
        `Template "${tmpl.name}" has invalid bead IDs: ${invalid.join(", ")}`
      );
    }
  }

  // Clear existing templates for idempotent seeding
  await prisma.template.deleteMany();
  console.log("  Cleared existing templates.");

  for (const tmpl of templates) {
    // Convert catalog IDs → BeadState[] → design code
    const beadStates = tmpl.beads
      .map((id) => {
        const catalogBead = getCatalogBead(id)!;
        return catalogBeadToBeadState(catalogBead);
      });

    const designCode = encodeDesign(beadStates);

    await prisma.template.create({
      data: {
        name: tmpl.name,
        designCode,
        beadCount: tmpl.beads.length,
      },
    });

    console.log(`  ✓ ${tmpl.name} (${tmpl.beads.length} beads)`);
  }

  const count = await prisma.template.count();
  console.log(`\nDone! ${count} templates seeded.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
