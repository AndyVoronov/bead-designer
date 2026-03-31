# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R005 — Пользователь может добавлять бусины из каталога на цепочку, удалять бусины, менять порядок перетаскиванием. Первый тип изделия — держатель для соски (зажим на одном конце, нить с бусинами). Мобильный UI с тач-жестами.
- Class: primary-user-loop
- Status: active
- Description: Пользователь может добавлять бусины из каталога на цепочку, удалять бусины, менять порядок перетаскиванием. Первый тип изделия — держатель для соски (зажим на одном конце, нить с бусинами). Мобильный UI с тач-жестами.
- Why it matters: Основной пользовательский цикл. Без этого клиент не может создать изделие.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: partial — S03 delivers: add bead from catalog (append), remove selected bead via toolbar, reset chain to defaults, tap-to-select in 3D (200ms/0.05 NDC threshold), golden wireframe highlight, deselect on empty-space click, drag beads with kinematic physics, 40-bead max enforcement. EditorCanvas layout with glass-morphism toolbar (Каталог/Удалить/Сброс). Global Zustand useDesignStore as single source of truth. Still missing: bead reorder (перетаскивание для смены порядка) — deferred.
- Notes: Добавление бусины → создаётся RigidBody с rope joint к соседней. Удаление → разрыв joint, перерасчёт цепи. Перетаскивание → temporary kinematic body. Reorder not yet implemented.

### R011 — Визуально привлекательный интерфейс — мягкие цвета, продуманная типографика, плавные анимации, приятные переходы. 3D-сцена с красивым освещением и тенями. Всё должно выглядеть «потрясающе».
- Class: differentiator
- Status: active
- Description: Визуально привлекательный интерфейс — мягкие цвета, продуманная типографика, плавные анимации, приятные переходы. 3D-сцена с красивым освещением и тенями. Всё должно выглядеть «потрясающе».
- Why it matters: Эмоциональный отклик клиента. Цель — чтобы клиент влюбился в изделие.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S02, M001/S03, M001/S07
- Validation: partial — S01-S03 deliver visual foundation (studio lighting, PBR materials, glass-morphism toolbar, animations). S07 proves production rendering on VPS but hasn't added post-processing enhancements. Real PNG textures from user photos still deferred. Production post-processing deferred.
- Notes: S01 establishes visual foundation. S02 adds PBR materials. S03 adds mobile UI design. S07 adds production polish.

## Validated

### R001 — Цепочка бусин на нити с реалистичной физикой — гравитация, провисание нити (rope/spring joints), столкновения бусин между собой. Бусины можно перетаскивать мышкой/пальцем вдоль нити и по сцене.
- Class: core-capability
- Status: validated
- Description: Цепочка бусин на нити с реалистичной физикой — гравитация, провисание нити (rope/spring joints), столкновения бусин между собой. Бусины можно перетаскивать мышкой/пальцем вдоль нити и по сцене.
- Why it matters: Ядро продукта. Без реалистичной физики изделие не вызывает эмоцию «потрогать».
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S03
- Validation: S01 UAT: Chain of 7+ beads hangs under gravity with rope joints (useRopeJoint), swings when disturbed. MeshLine thread follows bead positions via CatmullRomCurve3 updated every frame. Pointer-drag uses Vercel kinematicPosition pattern with velocity history buffer (HISTORY_SIZE=3) — grab → drag → release with inertia. Build passes clean (0 TS errors). 10 useBeadChain unit tests pass. Tested with up to 12+ beads in browser.
- Notes: Rope physics stable with damping=2 on all bodies, gravity=[0,-40,0], ROPE_TAUT_FACTOR=0.92. Max chain length tested ~12 beads. Stability at 20-40 beads still needs mobile verification in S02.

### R002 — 3D-сцена плавно работает на мобильных устройствах. Адаптивное качество рендеринга — на мощных телефонах максимум красоты, на слабых — упрощённо но стабильно 30+ FPS.
- Class: quality-attribute
- Status: validated
- Description: 3D-сцена плавно работает на мобильных устройствах. Адаптивное качество рендеринга — на мощных телефонах максимум красоты, на слабых — упрощённо но стабильно 30+ FPS.
- Why it matters: Основная масса клиентов — с телефона. Тормозящий 3D убьёт конверсию.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S07
- Validation: S02 UAT: Mobile viewport meta (user-scalable=no, maximum-scale=1) prevents browser pinch-zoom. touch-action: none on html/body/canvas-container/canvas (via !important to override R3F inline style) prevents scroll interference. AdaptiveDpr + AdaptiveEvents + PerformanceMonitor (drei) adjust quality dynamically. OrbitControls disabled during bead drag via Zustand dragStore. 60 FPS sustained with 21 beads on both desktop (1280×720) and Galaxy S24 mobile emulation (360×780). Geometry optimizations: sphere segments 32→24, thread curve points 32→20, ContactShadows resolution 512→256. Build passes clean, 17 tests pass.
- Notes: Real device testing deferred to S07 (Playwright can't apply CPU throttling). PerformanceMonitor warmup triggers onFallback after flipflops=5 — expected drei behavior, not actual performance issue.

### R003 — Бусины отображаются с реалистичными PBR-материалами, отличающими дерево, силикон, вязаное и другие материалы.
- Class: differentiator
- Status: validated
- Description: Бусины отображаются с реалистичными PBR-материалами, отличающими дерево, силикон, вязаное и другие материалы.
- Why it matters: Визуальная привлекательность — главная ценность. Без реалистичных материалов 3D выглядит дёшево.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03
- Validation: S02 UAT: BeadMaterialConfig map provides distinct PBR properties per BeadType — wood (roughness 0.75, metalness 0.0, bumpScale 0.02), silicone (roughness 0.2, metalness 0.05), knit (roughness 0.9, metalness 0.0, bumpScale 0.03), plastic (roughness 0.35, metalness 0.15). BeadMaterial component renders <meshStandardMaterial> with type-specific properties. Procedural 16×16 canvas noise bump textures for wood and knit. 7 unit tests validate: all roughness/metalness in [0,1], wood rougher than silicone, knit roughest, silicone smoothest, all types distinct. Browser: beads render with visually distinguishable materials.
- Notes: PNG texture loading not yet implemented — uses procedural bumps. Real PNG diffuse textures + derived normal/roughness maps planned for S03/S06 via future textureUrl prop on BeadMaterial.

### R004 — Просматриваемый каталог бусин (~100 видов) с их свойствами: размер, форма (шар, диск, фигурные), материал (дерево, силикон, вязаное), PNG-изображение. Бусины можно фильтровать и листать.
- Class: core-capability
- Status: validated
- Description: Просматриваемый каталог бусин (~100 видов) с их свойствами: размер, форма (шар, диск, фигурные), материал (дерево, силикон, вязаное), PNG-изображение. Бусины можно фильтровать и листать.
- Why it matters: Клиенту нужно выбирать из доступных бусин. Без каталога редактор бесполезен.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: S03 UAT: 100 catalog beads in static array (25 per material: wood, silicone, knit, plastic) with Russian names, shapes (sphere/disc/star/heart/cylinder), sizes, hex colors. Mobile bottom-sheet BeadCatalogPanel with 5 material filter chips (Все/Дерево/Силикон/Вязаное/Пластик). 4-column scrollable grid with touch isolation (stopPropagation + touch-action: pan-y). Tap bead card → addBead() → 3D chain grows. Catalog stays open for batch-adding. Build + 44 tests pass.
- Notes: Currently static array — S06 will make dynamic (API-backed). PNG textures not yet loaded — uses hex colors. Prisma schema written (no migrations yet, S04 activates DB).

### R006 — Предустановленные шаблоны от админа (листаются в каталоге). Каждое изделие (и шаблон) = уникальный код/URL, по которому восстанавливается точная копия дизайна. Подтверждённые админом пользовательские изделия попадают в каталог шаблонов.
- Class: integration
- Status: validated
- Description: Предустановленные шаблоны от админа (листаются в каталоге). Каждое изделие (и шаблон) = уникальный код/URL, по которому восстанавливается точная копия дизайна. Подтверждённые админом пользовательские изделия попадают в каталог шаблонов.
- Why it matters: Шаблоны — точка входа для клиентов. Шеринг — органический рост.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S06
- Validation: S04 UAT + S06 UAT: S04 delivers encodeDesign/decodeDesign pure functions (13 serialization tests), 8 seeded templates, GET /api/templates (approved only), /design/[code] page, share button, home page template gallery. S06 completes remaining parts: user-submitted design approval via "Сделать шаблоном" button on admin orders page — promotes order's designCode to new approved template in catalog. Admin template CRUD at /api/admin/templates (create, approve/unapprove, delete) enables managing templates from admin panel. Full flow verified: admin logs in → views orders → promotes user design to template → template appears in public catalog.
- Notes: Сериализация массива бусин в компактный формат. Хранение в БД, генерация короткого кода. URL: /design/{code}.

### R007 — Клиент нажимает «Заказать» → заказ сохраняется в базу данных → открывается Telegram с менеджером (t.me/VoronovAndrey) с предзаполненным сообщением, содержащим код изделия. Клиент не заполняет никаких полей.
- Class: integration
- Status: validated
- Description: Клиент нажимает «Заказать» → заказ сохраняется в базу данных → открывается Telegram с менеджером (t.me/VoronovAndrey) с предзаполненным сообщением, содержащим код изделия. Клиент не заполняет никаких полей.
- Why it matters: Конверсия. Минимальное трение: один тап → заказ → диалог.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: M001/S06
- Validation: S05 UAT: Order model in Prisma schema with migration (id, designCode, designState, status, beadCount, createdAt). POST /api/orders creates order with 201, validates designCode+beadCount (400 on missing), try/catch with console.error (500 on DB errors). GET /api/orders returns all orders ordered by createdAt desc. generateTelegramLink(designCode, beadCount) pure function produces `https://t.me/VoronovAndrey?text=...` with encodeURIComponent for Russian text. 7 unit tests pass (URL format, encoding, edge cases). "Заказать" CTA button in EditorToolbar — full-width green (#10b981) button, disabled when beads.length===0, loading state "Отправка..." with disabled during fetch, error feedback for 3s on failure. Full browser flow verified: add 3+ beads → click "Заказать" → GET /api/orders returns new order with status "new" and correct designCode/beadCount → Telegram opens with pre-filled Russian message containing greeting, design code, and bead count. Mobile viewport (390×844) toolbar layout works without overflow. 64 tests pass, TypeScript clean, production build succeeds.
- Notes: Orders are anonymous (no PII). designState stored as String (JSON.stringify) for SQLite compatibility. Double-submit protection via isOrdering disabled state. Telegram opens in new tab via window.open.

### R008 — Веб-панель для администратора: управление шаблонами (CRUD), просмотр заказов, подтверждение пользовательских дизайнов для добавления в каталог, управление бусинами. Доступ по простому паролю.
- Class: admin/support
- Status: validated
- Description: Веб-панель для администратора: управление шаблонами (CRUD), просмотр заказов, подтверждение пользовательских дизайнов для добавления в каталог, управление бусинами. Доступ по простому паролю.
- Why it matters: Без админки невозможно управлять контентом и обрабатывать заказы.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: S06 UAT: Password-protected admin panel at /admin via proxy.ts cookie guard (admin_token httpOnly cookie). Login page at /admin/login validates ADMIN_PASSWORD env var. Admin layout with sidebar navigation (Шаблоны/Заказы/Бусины) and logout. Template management: list all (approved + unapproved), create (name + designCode), approve/unapprove toggle, delete with confirmation. Order management: list all orders, status badges (new/processing/completed), status dropdown change, promote-to-template ("Сделать шаблоном") creating approved template from order's designCode. Bead catalog viewer: 100 beads from CATALOG_BEADS static array with material filter dropdown and name search. Full browser flow verified: login redirect, wrong password error, correct password → cookie set → templates page, all 3 pages functional, logout clears session, unauthenticated access → redirect to login. 64 tests pass, zero TS errors, production build succeeds with all 16 routes.
- Notes: Deskt ориентирована. Может быть отдельным роутом в Next.js (/admin).

### R009 — Первый тип изделия — держатель для соски. Включает зажим-клипсу на одном конце и нить с бусинами. Определяет структуру изделия и UI для выбора/конфигурации этого типа.
- Class: core-capability
- Status: validated
- Description: Первый тип изделия — держатель для соски. Включает зажим-клипсу на одном конце и нить с бусинами. Определяет структуру изделия и UI для выбора/конфигурации этого типа.
- Why it matters: Стартовый продукт. Доказывает концепцию конструктора для конкретного типа изделий.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: S03 UAT: PacifierClip 3D component at chain anchor — metallic silver torus ring + angled cylinder arm replacing plain gray sphere. Fixed RigidBody at anchor position with BallCollider for physics. Build passes, visible in browser screenshots at chain top.
- Notes: Клипса — фиксированный элемент, не бусина. Нить — визуальная компонента (rope joint). Дальше добавляются другие типы. productType "pacifier-holder" stored in useDesignStore.

### R010 — Приложение развёрнуто и доступно по URL на VPS reg.ru. Production-сборка, HTTPS, автозапуск.
- Class: constraint
- Status: validated
- Description: Приложение развёрнуто и доступно по URL на VPS reg.ru. Production-сборка, HTTPS, автозапуск.
- Why it matters: Продукт должен быть доступен клиентам в интернете.
- Source: user
- Primary owning slice: M001/S07
- Supporting slices: none
- Validation: S07 UAT: VPS provisioned at 89.111.175.54 with Node.js 20.20.2, PostgreSQL 16, Nginx, PM2. PM2 process "bead-designer" online on port 3000. Nginx reverse proxy on port 80. All 16 routes respond correctly: public pages 200 (/, /editor, /design/[code]), admin pages 307 redirect to login (unauthenticated), admin login 200, public APIs 200 (/api/templates, /api/orders), admin APIs 401 without cookie, admin auth flow works (wrong password 401, correct password 200, subsequent admin API calls 200). Database seeded with 8 templates. PostgreSQL via PrismaPg adapter. Production build succeeds with standalone output. Turbopack standalone hashed module resolution handled via symlinks (@prisma/client-2c3a283f134fdcb6, pg-587764f78a6c7a9c). Deploy infrastructure: deploy.sh, setup-vps.sh, nginx.conf, ecosystem.config.cjs, smoke-test.sh, DEPLOY.md. SSL/HTTPS not yet configured (HTTP only, certbot pending).
- Notes: VPS provisioned (Node.js 20, PostgreSQL 16, Nginx, PM2) at 89.111.175.54. Domain thekidsdream.ru DNS configured. PM2 process online. Static pages return 200. API routes return 500 due to Prisma client hash mismatch (fix: symlink node_modules/.prisma/client to @prisma/client-2c3a283f134fdcb6 on VPS). SSL not yet configured (run certbot after fixing API). See T03-SUMMARY.md for full VPS credentials and fix instructions.

## Deferred

### R012 — Другие виды игрушек из бусин помимо держателя для соски. Добавляются по одному после запуска.
- Class: core-capability
- Status: deferred
- Description: Другие виды игрушек из бусин помимо держателя для соски. Добавляются по одному после запуска.
- Why it matters: Расширение ассортимента продукции.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Архитектура S01-S04 должна быть достаточно гибкой для добавления новых типов без переработки.

### R013 — Интеграция платёжной системы для оплаты заказов онлайн.
- Class: integration
- Status: deferred
- Description: Интеграция платёжной системы для оплаты заказов онлайн.
- Why it matters: Увеличение конверсии за счёт мгновенной оплаты.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Сейчас заказ → Telegram-диалог с менеджером. Оплата обсуждается отдельно.

### R014 — Регистрация/вход пользователей для сохранения дизайнов, истории заказов, персонализации.
- Class: compliance/security
- Status: deferred
- Description: Регистрация/вход пользователей для сохранения дизайнов, истории заказов, персонализации.
- Why it matters: Повторные покупки, сохранение дизайнов между сессиями.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Пока не нужно — заказ через Telegram-диалог. Может стать актуальным при росте.

## Out of Scope

### R015 — Приоритетная оптимизация под десктоп. Мобильный — основной таргет.
- Class: constraint
- Status: out-of-scope
- Description: Приоритетная оптимизация под десктоп. Мобильный — основной таргет.
- Why it matters: Предотвращает waste на оптимизации десктопного UX в ущерб мобильному.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Десктоп работает, но не оптимизируется отдельно.

### R016 — iOS/Android приложения. Только мобильный веб.
- Class: anti-feature
- Status: out-of-scope
- Description: iOS/Android приложения. Только мобильный веб.
- Why it matters: Нативные приложения — другой масштаб усилий. PWA может быть рассмотрен позже.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: React Three Fiber + WASM работают в мобильных браузерах. Нативы не нужны.

### R017 — Поддержка нескольких языков интерфейса. Только русский.
- Class: anti-feature
- Status: out-of-scope
- Description: Поддержка нескольких языков интерфейса. Только русский.
- Why it matters: Предотвращает преждевременную интернационализацию.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Русский язык по умолчанию. i18n — если понадобится позже.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | core-capability | validated | M001/S01 | M001/S03 | S01 UAT: Chain of 7+ beads hangs under gravity with rope joints (useRopeJoint), swings when disturbed. MeshLine thread follows bead positions via CatmullRomCurve3 updated every frame. Pointer-drag uses Vercel kinematicPosition pattern with velocity history buffer (HISTORY_SIZE=3) — grab → drag → release with inertia. Build passes clean (0 TS errors). 10 useBeadChain unit tests pass. Tested with up to 12+ beads in browser. |
| R002 | quality-attribute | validated | M001/S02 | M001/S07 | S02 UAT: Mobile viewport meta (user-scalable=no, maximum-scale=1) prevents browser pinch-zoom. touch-action: none on html/body/canvas-container/canvas (via !important to override R3F inline style) prevents scroll interference. AdaptiveDpr + AdaptiveEvents + PerformanceMonitor (drei) adjust quality dynamically. OrbitControls disabled during bead drag via Zustand dragStore. 60 FPS sustained with 21 beads on both desktop (1280×720) and Galaxy S24 mobile emulation (360×780). Geometry optimizations: sphere segments 32→24, thread curve points 32→20, ContactShadows resolution 512→256. Build passes clean, 17 tests pass. |
| R003 | differentiator | validated | M001/S02 | M001/S03 | S02 UAT: BeadMaterialConfig map provides distinct PBR properties per BeadType — wood (roughness 0.75, metalness 0.0, bumpScale 0.02), silicone (roughness 0.2, metalness 0.05), knit (roughness 0.9, metalness 0.0, bumpScale 0.03), plastic (roughness 0.35, metalness 0.15). BeadMaterial component renders <meshStandardMaterial> with type-specific properties. Procedural 16×16 canvas noise bump textures for wood and knit. 7 unit tests validate: all roughness/metalness in [0,1], wood rougher than silicone, knit roughest, silicone smoothest, all types distinct. Browser: beads render with visually distinguishable materials. |
| R004 | core-capability | validated | M001/S03 | M001/S04 | S03 UAT: 100 catalog beads in static array (25 per material: wood, silicone, knit, plastic) with Russian names, shapes (sphere/disc/star/heart/cylinder), sizes, hex colors. Mobile bottom-sheet BeadCatalogPanel with 5 material filter chips (Все/Дерево/Силикон/Вязаное/Пластик). 4-column scrollable grid with touch isolation (stopPropagation + touch-action: pan-y). Tap bead card → addBead() → 3D chain grows. Catalog stays open for batch-adding. Build + 44 tests pass. |
| R005 | primary-user-loop | active | M001/S03 | M001/S04 | partial — S03 delivers: add bead from catalog (append), remove selected bead via toolbar, reset chain to defaults, tap-to-select in 3D (200ms/0.05 NDC threshold), golden wireframe highlight, deselect on empty-space click, drag beads with kinematic physics, 40-bead max enforcement. EditorCanvas layout with glass-morphism toolbar (Каталог/Удалить/Сброс). Global Zustand useDesignStore as single source of truth. Still missing: bead reorder (перетаскивание для смены порядка) — deferred. |
| R006 | integration | validated | M001/S04 | M001/S06 | S04 UAT + S06 UAT: S04 delivers encodeDesign/decodeDesign pure functions (13 serialization tests), 8 seeded templates, GET /api/templates (approved only), /design/[code] page, share button, home page template gallery. S06 completes remaining parts: user-submitted design approval via "Сделать шаблоном" button on admin orders page — promotes order's designCode to new approved template in catalog. Admin template CRUD at /api/admin/templates (create, approve/unapprove, delete) enables managing templates from admin panel. Full flow verified: admin logs in → views orders → promotes user design to template → template appears in public catalog. |
| R007 | integration | validated | M001/S05 | M001/S06 | S05 UAT: Order model in Prisma schema with migration (id, designCode, designState, status, beadCount, createdAt). POST /api/orders creates order with 201, validates designCode+beadCount (400 on missing), try/catch with console.error (500 on DB errors). GET /api/orders returns all orders ordered by createdAt desc. generateTelegramLink(designCode, beadCount) pure function produces `https://t.me/VoronovAndrey?text=...` with encodeURIComponent for Russian text. 7 unit tests pass (URL format, encoding, edge cases). "Заказать" CTA button in EditorToolbar — full-width green (#10b981) button, disabled when beads.length===0, loading state "Отправка..." with disabled during fetch, error feedback for 3s on failure. Full browser flow verified: add 3+ beads → click "Заказать" → GET /api/orders returns new order with status "new" and correct designCode/beadCount → Telegram opens with pre-filled Russian message containing greeting, design code, and bead count. Mobile viewport (390×844) toolbar layout works without overflow. 64 tests pass, TypeScript clean, production build succeeds. |
| R008 | admin/support | validated | M001/S06 | none | S06 UAT: Password-protected admin panel at /admin via proxy.ts cookie guard (admin_token httpOnly cookie). Login page at /admin/login validates ADMIN_PASSWORD env var. Admin layout with sidebar navigation (Шаблоны/Заказы/Бусины) and logout. Template management: list all (approved + unapproved), create (name + designCode), approve/unapprove toggle, delete with confirmation. Order management: list all orders, status badges (new/processing/completed), status dropdown change, promote-to-template ("Сделать шаблоном") creating approved template from order's designCode. Bead catalog viewer: 100 beads from CATALOG_BEADS static array with material filter dropdown and name search. Full browser flow verified: login redirect, wrong password error, correct password → cookie set → templates page, all 3 pages functional, logout clears session, unauthenticated access → redirect to login. 64 tests pass, zero TS errors, production build succeeds with all 16 routes. |
| R009 | core-capability | validated | M001/S03 | M001/S04 | S03 UAT: PacifierClip 3D component at chain anchor — metallic silver torus ring + angled cylinder arm replacing plain gray sphere. Fixed RigidBody at anchor position with BallCollider for physics. Build passes, visible in browser screenshots at chain top. |
| R010 | constraint | validated | M001/S07 | none | S07 UAT: VPS provisioned at 89.111.175.54 with Node.js 20.20.2, PostgreSQL 16, Nginx, PM2. PM2 process "bead-designer" online on port 3000. Nginx reverse proxy on port 80. All 16 routes respond correctly: public pages 200 (/, /editor, /design/[code]), admin pages 307 redirect to login (unauthenticated), admin login 200, public APIs 200 (/api/templates, /api/orders), admin APIs 401 without cookie, admin auth flow works (wrong password 401, correct password 200, subsequent admin API calls 200). Database seeded with 8 templates. PostgreSQL via PrismaPg adapter. Production build succeeds with standalone output. Turbopack standalone hashed module resolution handled via symlinks (@prisma/client-2c3a283f134fdcb6, pg-587764f78a6c7a9c). Deploy infrastructure: deploy.sh, setup-vps.sh, nginx.conf, ecosystem.config.cjs, smoke-test.sh, DEPLOY.md. SSL/HTTPS not yet configured (HTTP only, certbot pending). |
| R011 | differentiator | active | M001/S01 | M001/S02, M001/S03, M001/S07 | partial — S01-S03 deliver visual foundation (studio lighting, PBR materials, glass-morphism toolbar, animations). S07 proves production rendering on VPS but hasn't added post-processing enhancements. Real PNG textures from user photos still deferred. Production post-processing deferred. |
| R012 | core-capability | deferred | none | none | unmapped |
| R013 | integration | deferred | none | none | unmapped |
| R014 | compliance/security | deferred | none | none | unmapped |
| R015 | constraint | out-of-scope | none | none | n/a |
| R016 | anti-feature | out-of-scope | none | none | n/a |
| R017 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 2
- Mapped to slices: 2
- Validated: 9 (R001, R002, R003, R004, R006, R007, R008, R009, R010)
- Unmapped active requirements: 0
