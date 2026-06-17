# Graph Report - .  (2026-06-17)

## Corpus Check
- 150 files · ~398,247 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 526 nodes · 734 edges · 57 communities (33 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Bead Editor Components|Bead Editor Components]]
- [[_COMMUNITY_Design & Code Pages|Design & Code Pages]]
- [[_COMMUNITY_Database & Prisma|Database & Prisma]]
- [[_COMMUNITY_3D Thread Line Scene|3D Thread Line Scene]]
- [[_COMMUNITY_App Layout & Fonts|App Layout & Fonts]]
- [[_COMMUNITY_Package Config|Package Config]]
- [[_COMMUNITY_Products & Admin API|Products & Admin API]]
- [[_COMMUNITY_Landing Bead Animation|Landing Bead Animation]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Dependencies|Dependencies]]
- [[_COMMUNITY_Auth Routes|Auth Routes]]
- [[_COMMUNITY_Scheduled Posts Client|Scheduled Posts Client]]
- [[_COMMUNITY_Editor Toolbar|Editor Toolbar]]
- [[_COMMUNITY_Image Scripts|Image Scripts]]
- [[_COMMUNITY_Books Page|Books Page]]
- [[_COMMUNITY_Blog Components|Blog Components]]
- [[_COMMUNITY_Cart & Checkout|Cart & Checkout]]
- [[_COMMUNITY_Care Guides|Care Guides]]
- [[_COMMUNITY_Pexels Integration|Pexels Integration]]
- [[_COMMUNITY_LLM Blog Generator|LLM Blog Generator]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]

## God Nodes (most connected - your core abstractions)
1. `prisma` - 28 edges
2. `VerletRope` - 26 edges
3. `useDesignStore` - 16 edges
4. `compilerOptions` - 16 edges
5. `useAuth()` - 14 edges
6. `BeadType` - 14 edges
7. `BeadState` - 13 edges
8. `decodeDesign()` - 12 edges
9. `getCatalogBead()` - 10 edges
10. `CATALOG_BEADS` - 7 edges

## Surprising Connections (you probably didn't know these)
- `processUploadedImage()` --calls--> `sharp`  [INFERRED]
  src/lib/image-processor.ts → scripts/convert-images.ts
- `serveResized()` --calls--> `sharp`  [INFERRED]
  src/lib/image-processor.ts → scripts/convert-images.ts
- `main()` --calls--> `getCatalogBead()`  [EXTRACTED]
  prisma/seed.ts → src/data/catalogBeads.ts
- `main()` --calls--> `catalogBeadToBeadState()`  [EXTRACTED]
  prisma/seed.ts → src/lib/catalogUtils.ts
- `main()` --calls--> `encodeDesign()`  [EXTRACTED]
  prisma/seed.ts → src/lib/serialization.ts

## Import Cycles
- None detected.

## Communities (57 total, 24 thin omitted)

### Community 0 - "Bead Editor Components"
Cohesion: 0.06
Nodes (41): PacifierClip(), ADD_CYCLE, BEAD_TYPE_DEFAULTS, BeadTypeConfig, DEFAULT_BEADS, useBeadChain(), UseBeadChainReturn, BEAD_MATERIAL_CONFIGS (+33 more)

### Community 1 - "Design & Code Pages"
Cohesion: 0.08
Nodes (22): Scene, SceneLoader(), DesignLoader(), DesignLoaderProps, EditorCanvas(), Scene, EditorToolbar(), EditorLoader() (+14 more)

### Community 2 - "Database & Prisma"
Cohesion: 0.11
Nodes (23): MATERIAL_LABELS, MATERIAL_OPTIONS, SHAPE_LABELS, CATALOG_BEADS, getCatalogBead(), BeadCatalogPanel(), BeadCatalogPanelProps, FilterOption (+15 more)

### Community 3 - "3D Thread Line Scene"
Cohesion: 0.08
Nodes (11): _curvePoints, ThreadLine(), ThreadLineProps, ThreeElements, Constraint, _correction, _delta, _diff (+3 more)

### Community 4 - "App Layout & Fonts"
Cohesion: 0.10
Nodes (18): metadata, nunito, pacifico, viewport, LoginModal(), SignOut(), UnsavedChangesDialog(), UnsavedChangesDialogProps (+10 more)

### Community 5 - "Package Config"
Cohesion: 0.07
Nodes (28): devDependencies, eslint, eslint-config-next, jsdom, tailwindcss, @tailwindcss/postcss, @testing-library/jest-dom, @testing-library/react (+20 more)

### Community 7 - "Landing Bead Animation"
Cohesion: 0.11
Nodes (9): BeadStringScene(), DESKTOP_POINTS, MOBILE_POINTS, SCENE_BEADS, SceneBeadShape, LandingOverlay(), MATERIALS, reviews (+1 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Dependencies"
Cohesion: 0.11
Nodes (19): dependencies, dotenv, jose, lucide-react, lz-string, meshline, next, next-auth (+11 more)

### Community 10 - "Auth Routes"
Cohesion: 0.11
Nodes (6): { handlers, signIn, signOut, auth }, OAuth2Provider, Session, User, VK, Yandex

### Community 11 - "Scheduled Posts Client"
Cohesion: 0.13
Nodes (13): getScheduledPosts(), ScheduledPostsPage(), CalendarView(), EditPostInline(), MONTHS_RU, Post, Sort, Status (+5 more)

### Community 13 - "Image Scripts"
Cohesion: 0.22
Nodes (11): IMAGE_SIZES, ImageSize, joinPath(), processUploadedImage(), serveResized(), fs, main(), path (+3 more)

### Community 14 - "Books Page"
Cohesion: 0.17
Nodes (4): faqData, reviews, steps, metadata

### Community 15 - "Blog Components"
Cohesion: 0.22
Nodes (6): CareGuide, CareGuideItem, Category, CATEGORY_COLORS, COLOR_MAP, ICON_MAP

### Community 16 - "Cart & Checkout"
Cohesion: 0.31
Nodes (5): downloadPexelsImage(), PexelsPhoto, searchPexels(), slugToSearchQuery(), CYRILLIC_MAP

### Community 17 - "Care Guides"
Cohesion: 0.25
Nodes (6): CareGuide, CareGuideItem, Category, CATEGORY_COLORS, ICON_COMPONENTS, ICON_OPTIONS

### Community 18 - "Pexels Integration"
Cohesion: 0.33
Nodes (4): adapter, CATEGORIES, pool, prisma

### Community 20 - "Community 20"
Cohesion: 0.40
Nodes (3): Order, STATUS_BADGES, STATUS_OPTIONS

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (3): adapter, pool, prisma

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (3): AUTH_SECRET, GET(), readVkCookie()

## Knowledge Gaps
- **196 isolated node(s):** `deploy.sh script`, `eslintConfig`, `nextConfig`, `name`, `version` (+191 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VerletRope` connect `3D Thread Line Scene` to `Bead Editor Components`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `useDesignStore` connect `Design & Code Pages` to `Bead Editor Components`, `Database & Prisma`, `Editor Toolbar`, `App Layout & Fonts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `prisma` connect `Products & Admin API` to `Community 34`, `Community 36`, `Community 37`, `Community 38`, `Community 40`, `Auth Routes`, `Scheduled Posts Client`, `Community 42`, `Community 43`, `Community 44`, `Cart & Checkout`, `Community 22`, `Community 25`, `Community 26`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `deploy.sh script`, `eslintConfig`, `nextConfig` to the rest of the system?**
  _196 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bead Editor Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05683563748079877 - nodes in this community are weakly interconnected._
- **Should `Design & Code Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.08108108108108109 - nodes in this community are weakly interconnected._
- **Should `Database & Prisma` be split into smaller, more focused modules?**
  _Cohesion score 0.10606060606060606 - nodes in this community are weakly interconnected._