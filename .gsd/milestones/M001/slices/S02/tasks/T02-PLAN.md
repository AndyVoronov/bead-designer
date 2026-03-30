---
estimated_steps: 4
estimated_files: 4
---

# T02: Create type-specific PBR materials for beads

**Slice:** S02 — Мобильный рендеринг + PBR-материалы
**Milestone:** M001

## Description

Creates visually distinct PBR materials for each bead type (wood, silicone, knit, plastic) to fulfill R003. Currently all beads render with identical `roughness=0.3, metalness=0.1` — they look the same apart from color. This task creates a material configuration map and a `BeadMaterial` React component that applies type-specific PBR properties, then integrates it into `BeadRigidBody`.

No PNG textures are available yet (they come later from user/admin uploads via S03/S06). Materials are differentiated purely by PBR constants: roughness, metalness, bumpScale, envMapIntensity. The `BeadMaterial` component is designed to accept optional `textureUrl` in the future, loading it via drei's `useTexture` with a Suspense boundary.

**Skills:** None required beyond standard React/Three.js patterns.

## Steps

1. **Create `src/lib/beadMaterialConfig.ts`** — Material configuration map:
   - Export `BeadMaterialConfig` interface: `roughness: number`, `metalness: number`, `bumpScale: number`, `envMapIntensity: number`
   - Export `BEAD_MATERIAL_CONFIGS: Record<BeadType, BeadMaterialConfig>` with values:
     - `wood`: roughness 0.75, metalness 0.0, bumpScale 0.02, envMapIntensity 0.8 (matte, absorbs light, subtle bump for wood grain)
     - `silicone`: roughness 0.2, metalness 0.05, bumpScale 0.0, envMapIntensity 1.2 (smooth, glossy, slight sheen, strong reflections)
     - `knit`: roughness 0.9, metalness 0.0, bumpScale 0.03, envMapIntensity 0.5 (very rough, absorbs reflections, pronounced bump for knit texture)
     - `plastic`: roughness 0.35, metalness 0.15, bumpScale 0.0, envMapIntensity 1.0 (mid-range, slight metallic sheen)
   - Export a helper `getBeadMaterialConfig(type: BeadType): BeadMaterialConfig`

2. **Create `src/components/scene/BeadMaterial.tsx`** — React component:
   ```tsx
   interface BeadMaterialProps {
     type: BeadType;
     color: string;
   }
   ```
   Renders `<meshStandardMaterial>` with `color`, `roughness`, `metalness`, `envMapIntensity` from the config. For types with `bumpScale > 0` (wood, knit), generates a procedural bump texture using a small offscreen canvas (16x16 noise pattern) and assigns it as `bumpMap`. This avoids needing an external texture file while still providing visual differentiation. Include a code comment explaining that `useTexture` from drei can replace this when PNG textures become available.

3. **Modify `src/components/scene/BeadRigidBody.tsx`** — Add `type: BeadType` prop. Import `BeadMaterial`. Replace the inline `<meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />` with `<BeadMaterial type={type} color={color} />`. The `type` prop flows from `BeadState.type` through `BeadChain` → `BeadRigidBody`.

4. **Create `src/components/scene/__tests__/beadMaterial.test.ts`** — Unit tests:
   - Import `BEAD_MATERIAL_CONFIGS` and `getBeadMaterialConfig` from `src/lib/beadMaterialConfig.ts`
   - Test all 4 BeadTypes have configs in the map
   - Test each config has roughness in [0, 1] and metalness in [0, 1]
   - Test wood is rougher than silicone (roughness comparison)
   - Test knit is the roughest type
   - Test silicone has the lowest roughness
   - These tests validate the material differentiation contract — if any of these fail, the visual distinction goal is broken

## Must-Haves

- [ ] `src/lib/beadMaterialConfig.ts` exports config for all 4 BeadTypes with distinct roughness values
- [ ] `src/components/scene/BeadMaterial.tsx` renders meshStandardMaterial with type-specific PBR properties
- [ ] `src/components/scene/BeadRigidBody.tsx` accepts `type` prop and uses `<BeadMaterial>` instead of inline material
- [ ] `src/components/scene/__tests__/beadMaterial.test.ts` tests pass with 6+ assertions

## Verification

- `npx vitest run src/components/scene/__tests__/beadMaterial.test.ts` — all tests pass
- `npx vitest run` — all tests pass (existing 10 + new)
- `npm run build` — zero errors
- Browser: 4 bead types are visually distinct — wood looks matte, silicone looks glossy, knit looks rough/bumpy, plastic looks slightly shiny

## Inputs

- `src/types/bead.ts` — BeadType union ("wood" | "silicone" | "knit" | "plastic")
- `src/components/scene/BeadRigidBody.tsx` — current inline material to replace
- `src/components/scene/BeadChain.tsx` — passes BeadState to BeadRigidBody (already has `type` field)

## Expected Output

- `src/lib/beadMaterialConfig.ts` — material configuration map and helper function
- `src/components/scene/BeadMaterial.tsx` — new PBR material component
- `src/components/scene/BeadRigidBody.tsx` — modified to use BeadMaterial
- `src/components/scene/__tests__/beadMaterial.test.ts` — new unit tests for material config
