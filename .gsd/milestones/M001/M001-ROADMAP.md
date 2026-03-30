# M001: 3D-конструктор игрушек из бусин

**Vision:** Полный мобильный веб-конструктор игрушек из бусин с реалистичным 3D-редактором и физикой — от каталога до заказа в один тап.

## Success Criteria

- Клиент на мобильном проходит полный цикл: открыть → выбрать шаблон/собрать с нуля → заказать → Telegram открывается с сообщением
- Цепочка бусин в 3D имеет реалистичную физику: провисает под гравитацией, бусины сталкиваются, перетаскиваются пальцем
- Материалы бусин визуально различимы: дерево выглядит как дерево, силикон — как силикон, вязаное — как вязаное
- Админ управляет шаблонами и заказами через веб-панель
- Приложение доступно по HTTPS на VPS reg.ru
- FPS 30+ на средних мобильных при взаимодействии с 20+ бусинами

## Key Risks / Unknowns

- **Мобильная производительность** — WebGL + WASM физика + пост-обработка на телефонах может тормозить с множеством бусин. Определяет качество UX на основной аудитории.
- **Стабильность rope physics** — цепочка из 20-40 бусин на spring/rope joints при быстрых жестах может расходиться или дёргаться.
- **PBR-материалы из PNG** — deriving реалистичных материалов из фотографий бусин (без отдельной normal map и roughness map) может выглядеть плоско.

## Proof Strategy

- Мобильная производительность → retire in S02 by proving 30+ FPS on real mobile with 20+ beads and touch interaction
- Rope physics stability → retire in S01 by proving stable chain with drag interaction, no explosions at high-speed gestures
- PBR from PNG → retire in S02 by rendering wood/silicone/knit beads with user-provided PNG textures and visually confirming material distinction

## Verification Classes

- Contract verification: unit tests для physics, serialization, API endpoints. Snapshot tests для UI.
- Integration verification: полный цикл заказа через API (create order → DB → Telegram link generation)
- Operational verification: деплой на VPS, HTTPS, автозапуск, доступность по URL
- UAT / human verification: визуальная оценка материалов на мобильном, эмоциональный отклик от 3D-взаимодействия

## Milestone Definition of Done

This milestone is complete only when all are true:

- Все слайсы завершены и их deliverables работают вместе
- Полный цикл заказа работает end-to-end на реальном мобильном: открыть → шаблон/с нуля → заказать → Telegram
- Админка позволяет управлять шаблонами и просматривать заказы
- Шеринг работает: ссылка восстанавливает точную копию дизайна
- Приложение развёрнуто на VPS reg.ru, HTTPS, доступно по URL
- FPS 30+ на средних мобильных устройствах при стандартном взаимодействии
- Success criteria перепроверены на живом поведении, не только артефактах

## Requirement Coverage

- Covers: R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011
- Partially covers: none
- Leaves for later: R012, R013, R014
- Orphan risks: none

## Slices

- [ ] **S01: 3D-физика цепочки бусин** `risk:high` `depends:[]`
  > After this: Цепочка сферических бусин висит в 3D-сцене под гравитацией, качается, бусины перетаскиваются мышкой. Десктоп-браузер, базовые материалы.

- [ ] **S02: Мобильный рендеринг + PBR-материалы** `risk:high` `depends:[S01]`
  > After this: Цепочка бусин рендерится на телефоне с реалистичными материалами (дерево, силикон, вязаное из PNG), адаптивное качество, тач-жесты, 30+ FPS.

- [ ] **S03: Каталог бусин + редактор UI** `risk:medium` `depends:[S02]`
  > After this: Пользователь на мобильном листает каталог бусин, добавляет/удаляет бусины на цепочку, собирает держатель для соски. Полный редакторский UI.

- [ ] **S04: Шаблоны + шеринг** `risk:medium` `depends:[S03]`
  > After this: Шаблоны листаются в каталоге и загружаются в редактор. Каждое изделие имеет уникальную ссылку — по ней восстанавливается точная копия дизайна.

- [ ] **S05: Заказ + Telegram** `risk:medium` `depends:[S04]`
  > After this: Кнопка «Заказать» сохраняет заказ в БД и открывает Telegram с менеджером с предзаполненным сообщением и кодом изделия.

- [ ] **S06: Админка** `risk:low` `depends:[S04,S05]`
  > After this: Админ через веб-панель управляет шаблонами (CRUD), просматривает заказы, подтверждает пользовательские дизайны в каталог.

- [ ] **S07: Интеграция + деплой** `risk:low` `depends:[S06]`
  > After this: Полное приложение работает на reg.ru VPS по HTTPS, протестировано на реальном мобильном, производительность в норме.

<!--
  Format rules (parsers depend on this exact structure):
  - Checkbox line: - [ ] **S01: Title** `risk:high|medium|low` `depends:[S01,S02]`
  - Demo line:     >  After this: one sentence showing what's demoable
  - Mark done:     change [ ] to [x]
  - Order slices by risk (highest first)
  - Each slice must be a vertical, demoable increment — not a layer
  - If all slices are completed exactly as written, the milestone's promised outcome should actually work at the stated proof level
  - depends:[X,Y] means X and Y must be done before this slice starts

  Planning quality rules:
  - Every slice must ship real, working, demoable code — no research-only or foundation-only slices
  - Early slices should prove the hardest thing works by building through the uncertain path
  - Each slice should establish a stable surface that downstream slices can depend on
  - Demo lines should describe concrete, verifiable evidence — not vague claims
  - In brownfield projects, ground slices in existing modules and patterns
  - If a slice doesn't produce something testable end-to-end, it's probably a layer — restructure it
  - If the milestone crosses multiple runtime boundaries (for example daemon + API + UI, bot + subprocess + service manager, or extension + RPC + filesystem), include an explicit final integration slice that proves the assembled system works end-to-end in a real environment
  - Contract or fixture proof does not replace final assembly proof when the user-visible outcome depends on live wiring
  - Each "After this" line must be truthful about proof level: if only fixtures or tests prove it, say so; do not imply the user can already perform the live end-to-end behavior unless that has actually been exercised
-->

## Boundary Map

### S01 → S02

Produces:
- `BeadChain` component (React) — рендерит цепочку физически-связанных бусин с rope/spring joints, гравитацией и столкновениями
- `useBeadChain` hook — управляет состоянием цепочки: массив бусин (id, type, position), add/remove/reset
- `BeadRigidBody` component — отдельная физическая бусина (RigidBody + mesh), принимает геометрию и размер
- `DragControls` hook — pointer-based перетаскивание RigidBody в 3D-сцене
- Physics scene config — Canvas + Physics из react-three-rapier, параметры гравитации, ground plane
- Bead chain state model — TypeScript types: `BeadId`, `BeadType`, `BeadState`, `ChainState`

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- Physics scene setup — Canvas, Physics, Lighting, Camera, ground plane (все настройки сцены)
- `BeadRigidBody` component — используется в редакторе для отображения каждой бусины на цепочке
- `DragControls` hook — используется в редакторе для перетаскивания бусин

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- `AdaptiveRenderer` component — оборачивает Canvas с PerformanceMonitor, dynamic DPR, conditional post-processing
- `TouchHandler` hook — тач-жесты для 3D-объектов (touchstart/move/end → drag)
- `BeadMaterialFactory` — создаёт PBR-материалы из данных бусины (PNG diffuse + material type → MeshStandardMaterial с настроенными roughness/metalness/normal)

Consumes from S01:
- `BeadChain` component — оборачивается в AdaptiveRenderer
- `BeadRigidBody` — использует BeadMaterialFactory для материалов

### S03 → S04

Produces:
- `Bead` model (Prisma schema + TypeScript types) — id, name, shape, size, material, texturePath, createdAt
- Bead seed data — массив ~100 бусин с метаданными (без текстур, текстуры добавляются отдельно)
- `useDesignStore` (Zustand) — глобальное состояние дизайна: beads[], addBead, removeBead, reorderBead, resetDesign, loadDesign
- `DesignState` type — сериализуемое состояние дизайна (массив бусин с типами и порядком)
- `BeadCatalogPanel` component — мобильный UI для листания и выбора бусин
- `EditorCanvas` component — компоновка 3D-сцены + каталог + toolbar в мобильном layout
- `PacifierHolder` product type — структура изделия: клипса + нить + бусины, UI для этого типа

Consumes from S01:
- `useBeadChain` — управляет физической цепочкой
- `BeadRigidBody` — рендерит бусины
- `DragControls` — перетаскивание в редакторе
Consumes from S02:
- `BeadMaterialFactory` — материалы для бусин в каталоге
- `AdaptiveRenderer` — обёртка для 3D-сцены
- `TouchHandler` — мобильные жесты

### S04 → S05

Produces:
- `DesignSerializer` — сериализует DesignState в компактный формат (JSON → LZ-String → base64url)
- `DesignDeserializer` — раскодирует строку обратно в DesignState
- `Template` model (Prisma schema) — id, name, designCode, beadCount, thumbnailUrl, isApproved, isUserSubmitted, createdAt
- Template API endpoints — GET /api/templates (list), GET /api/templates/[code] (load), POST /api/templates (admin create)
- `ShareableLink` — формат URL /design/[code] и хук useDesignFromUrl для парсинга и загрузки
- Template browser UI — листалка шаблонов с превью на главной странице

Consumes from S03:
- `DesignState` type — тип данных для сериализации
- `useDesignStore` — загрузка шаблона в store
- `BeadCatalogPanel`, `EditorCanvas` — навигация между каталогом шаблонов и редактором

### S05 → S06

Produces:
- `Order` model (Prisma schema) — id, designCode, designState (JSON), status (new/processing/completed), createdAt
- Order API — POST /api/orders (create), GET /api/orders (admin list), PATCH /api/orders/[id]/status
- `TelegramLinkGenerator` — формирует https://t.me/VoronovAndrey?text=... с кодом изделия и описанием
- Order button UI — компонент «Заказать» в редакторе, вызов API + redirect на Telegram

Consumes from S04:
- `DesignSerializer` — сериализация дизайна при сохранении заказа
- Template/Product API — контекст текущего дизайна

### S04 → S06

Produces:
- Template API endpoints — используются в админке для CRUD шаблонов

Consumes:
- nothing new (шаблоны уже существуют из S04)

### S06 → S07

Produces:
- Admin auth — простой password-based доступ к /admin
- Template management page — CRUD шаблонов в админке
- Order management page — просмотр заказов, смена статуса
- Design approval page — листа пользовательских дизайнов на подтверждение в каталог
- Bead management — просмотр/редактирование каталога бусин

Consumes from S04:
- Template API — управление шаблонами
Consumes from S05:
- Order API — просмотр заказов
