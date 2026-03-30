---
estimated_steps: 4
estimated_files: 4
---

# T01: Define bead data model and create ~100 catalog beads

**Slice:** S03 — Каталог бусин + редактор UI
**Milestone:** M001

## Description

Extend the existing `BeadType`/`BeadState` types with shape information and a `CatalogBead` interface. Create ~100 static catalog bead entries spanning all 4 materials. Write the Prisma schema for S04 (schema only, no DB). This task produces the data foundation that every subsequent task in this slice reads from.

## Steps

1. **Extend `src/types/bead.ts`** — Add `BeadShape` type union: `"sphere" | "disc" | "star" | "heart" | "cylinder"`. Add `CatalogBead` interface: `{ id: string; name: string; nameRu: string; shape: BeadShape; size: number; material: BeadType; color: string; secondaryColor?: string }`. Add optional `catalogBeadId?: string` field to existing `BeadState`. Keep all existing exports and types intact — this is additive only.

2. **Create `prisma/schema.prisma`** — Define the `Bead` model: `id Int @id @default(autoincrement())`, `name String`, `nameRu String`, `shape String` (stored as string, mapped in app), `size Float`, `material String`, `color String`, `createdAt DateTime @default(now())`. Add a `// TODO: S04 — add Template, Order models` comment. No `datasource` or `generator` block needed yet (S04 will configure PostgreSQL). Actually, include a minimal `datasource` with `provider = "postgresql"` and `url = env("DATABASE_URL")` and `generator client` block so the file is valid Prisma syntax, even if no migrations run.

3. **Create `src/data/catalogBeads.ts`** — Export `CATALOG_BEADS: CatalogBead[]` with ~100 entries. Distribution: ~25 wood (natural browns, tans, light/dark), ~25 silicone (pastels: pink, blue, mint, lavender, coral), ~25 knit (warm muted: cream, terracotta, sage, dusty rose, oatmeal), ~25 plastic (vibrant: red, blue, yellow, green, orange, purple). Each bead needs: id (`"cb-001"` through `"cb-100"`), name (English descriptive), nameRu (Russian name — creative, descriptive like "Берёза", "Розовый закат", etc.), shape (mostly "sphere", a few "disc", "star", "heart", "cylinder" for variety), size (0.15–0.28 range), material, color (hex string). Also export `getCatalogBead(id: string): CatalogBead | undefined` helper.

4. **Create `src/lib/catalogUtils.ts`** — Export `catalogBeadToBeadState(catalogBead: CatalogBead): BeadState` function that maps a CatalogBead to a BeadState with: `id: "bead-${Date.now()}-${random}"`, `catalogBeadId: catalogBead.id`, `type: catalogBead.material`, `radius: catalogBead.size * 0.8` (size is diameter concept, radius is half), `color: catalogBead.color`.

## Must-Haves

- [ ] `BeadShape` type defined in `src/types/bead.ts`
- [ ] `CatalogBead` interface defined in `src/types/bead.ts`
- [ ] `BeadState` has optional `catalogBeadId` field
- [ ] All existing types/exports still exported (no breakage)
- [ ] `prisma/schema.prisma` exists with valid Prisma syntax
- [ ] `CATALOG_BEADS` array has 80+ entries, each with all required fields
- [ ] `getCatalogBead()` helper exported from `src/data/catalogBeads.ts`
- [ ] `catalogBeadToBeadState()` utility exported from `src/lib/catalogUtils.ts`

## Verification

- `npx tsc --noEmit` — zero TypeScript errors (types are correct, imports resolve)
- `grep -c "CB-" src/data/catalogBeads.ts` returns >= 80 (catalog has 80+ bead entries)
- `grep -c "model Bead" prisma/schema.prisma` returns 1
- `grep "BeadShape" src/types/bead.ts` confirms new type exists

## Inputs

- `src/types/bead.ts` — existing types to extend (BeadType, BeadState)
- `src/lib/beadMaterialConfig.ts` — reference for BeadType values used in catalog

## Expected Output

- `src/types/bead.ts` — extended with BeadShape, CatalogBead, updated BeadState
- `src/data/catalogBeads.ts` — new: ~100 catalog bead entries + getCatalogBead helper
- `prisma/schema.prisma` — new: Bead model definition
- `src/lib/catalogUtils.ts` — new: catalogBeadToBeadState conversion utility
