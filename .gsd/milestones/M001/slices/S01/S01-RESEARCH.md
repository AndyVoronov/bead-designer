# S01 — Research

**Date:** 2026-03-29

## Summary

S01 реализует ядро продукта — физическую цепочку бусин в 3D-сцене. Это первый слайс, рисковый из-за неочевидных паттернов: цепочка из бусин на rope/spherical joints при перетаскивании может расходиться, а интеграция Three.js с Next.js SSR требует аккуратности. Однако решение найдено: **Vercel blog post "Building an interactive 3D event badge"** (Paul Henschel, апр 2024) содержит production-код с точно такой же архитектурой — fixed anchor → rope joints → kinematic drag → MeshLine для визуализации нити. Этот подход проверен на миллионах пользователей и является прямым прототипом нашей цепочки бусин.

Ключевой стек: Next.js App Router + React Three Fiber + React Three Rapier + @react-three/drei + meshline. Перетаскивание реализуется через переключение RigidBody в `kinematicPosition` режим с `setNextKinematicTranslation` в useFrame (Vercel pattern), а не через `@react-three/handle` (дополнительная зависимость с нестабильным API). Сериализуемая нить рендерится через MeshLine/CatmullRomCurve3 по позициям тел — выглядит как реальная верёвка/нить.

## Recommendation

Использовать **архитектуру Vercel badge** как основу:
1. `RigidBody type="fixed"` — якорь (клипса держателя, в S01 — просто fixed point)
2. Массив `RigidBody` с `BallCollider` для каждой бусины + rope joints между соседями
3. Перетаскивание: `onPointerDown` → `setBodyType('kinematicPosition')` → `setNextKinematicTranslation` в useFrame → `onPointerUp` → вернуть `type='dynamic'` + передать velocity
4. MeshLine по CatmullRomCurve3 для визуализации нити между бусинами
5. `angularDamping={2} linearDamping={2}` на всех телах для стабильности

Эта архитектура доказанно работает, минимизирует зависимости и даёт реалистичную физику.

## Implementation Landscape

### Key Files

- `src/app/layout.tsx` — корневой layout Next.js. Сюда подключаем глобальные стили (Tailwind), метаданные, шрифты.
- `src/app/page.tsx` — главная страница. Импортирует 3D-сцену через `dynamic()` с `ssr: false`.
- `src/components/scene/Scene.tsx` — корневой 3D-компонент: `Canvas` + `Physics` + освещение + камера.
- `src/components/scene/BeadChain.tsx` — компонент цепочки бусин. Управляет массивом RigidBody бусин + joints + MeshLine.
- `src/components/scene/BeadRigidBody.tsx` — отдельная физическая бусина (RigidBody + BallCollider + mesh).
- `src/components/scene/DragControls.tsx` — хук/логика перетаскивания RigidBody (pointer events + kinematic mode).
- `src/components/scene/ThreadLine.tsx` — визуализация нити через MeshLine + CatmullRomCurve3.
- `src/types/bead.ts` — TypeScript типы: `BeadId`, `BeadType`, `BeadState`, `ChainConfig`, `ChainState`.
- `src/hooks/useBeadChain.ts` — хук управления состоянием цепочки: beads[], addBead, removeBead, reset.
- `package.json` — зависимости: `@react-three/fiber`, `@react-three/rapier`, `@react-three/drei`, `three`, `meshline`.
- `tailwind.config.ts` — конфигурация Tailwind (mobile-first).

### Build Order

1. **Next.js проект + зависимости** — `create-next-app` + install Three.js, Rapier, drei, meshline. Настроить `next.config.ts` для транспиляции `meshline` (ESM-only пакет). Подтвердить: `npm run dev` стартует без ошибок.
2. **SSR-безопасный Canvas** — Обернуть 3D-сцену в `"use client"` компонент, подключить через `dynamic(() => import(Scene), { ssr: false })` в `page.tsx`. Это критический шаг — без него Next.js упадётся с `window is not defined`.
3. **Базовая физика: fixed anchor + 1 бусина** — `Physics gravity={[0, -40, 0]}` (Vercel uses -40 for snappier feel), `RigidBody type="fixed"` + `RigidBody type="dynamic"` + `useRopeJoint`. Подтвердить: бусина висит под якорем и качается.
4. **Цепочка из N бусин** — Обобщить на массив: fixed → bead1 → bead2 → ... → beadN. Каждый bead — RigidBody с BallCollider и MeshStandardMaterial. Rope joints между всеми соседями. Подтвердить: цепочка провисает реалистично.
5. **MeshLine для нити** — CatmullRomCurve3 по позициям всех тел → MeshLine. `extend({ MeshLineGeometry, MeshLineMaterial })`. Подтвердить: плавная кривая нити между бусинами.
6. **Перетаскивание бусин** — `onPointerDown/Up` на mesh бусины. Переключение в kinematicPosition + setNextKinematicTranslation в useFrame (raycasting через camera). On release: вернуть dynamic + передать velocity. Подтвердить: можно тянуть любую бусину, цепочка следит.
7. **useBeadChain хук** — React-состояние массива бусин, методы add/remove/reset. Пересоздание joints при изменении массива. Подтвердить: добавление/удаление бусины пересоздаёт цепочку.
8. **Освещение и окружение** — drei `Environment preset="studio"` + `ContactShadows`. Мягкий product-look визуал. Подтвердить: красивая сцена.

### Verification Approach

- `npm run dev` → открывает http://localhost:3000 без ошибок в консоли
- В браузере: цепочка из 5-10 бусин висит под gravity, провисает, качается при взаимодействии
- Мышка может перетаскивать любую бусину, цепочка реалистично следует за ней
- При отпускании бусина продолжает движение по инерции (velocity передана)
- Добавление бусины через useBeadChain визуально удлиняет цепочку
- MeshLine нить плавно проходит через все бусины
- `Physics debug` проп показывает коллайдеры и joints для отладки
- FPS монитор показывает стабильные 60fps на десктопе с 20+ бусинами

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Physics engine | React Three Rapier | WASM Rapier — стабильные rope/spherical joints, уже принято в D002 |
| 3D rendering | React Three Fiber | Декларативный React-рендерер, уже принято в D001 |
| Scene helpers | @react-three/drei | Environment, ContactShadows, OrbitControls — готовые компоненты |
| Нить/верёвка визуал | meshline | Shader-based thick line, Vercel использует в badge — проверен в production |
| State management | React useState + refs (S01) | Для физической цепочки refs к RigidBody — основная потребность. Zustand добавим в S03 когда понадобится глобальное состояние между компонентами |
| Drag | Встроенный R3F pointer events + kinematic body | Не нужна отдельная библиотека. Vercel pattern: onPointerDown → kinematicPosition → setNextKinematicTranslation в useFrame |

## Constraints

- **Next.js SSR** — Three.js требует `window`/`document`. Все Three.js компоненты должны быть `"use client"` и подключены через `dynamic(..., { ssr: false })`. Без этого будет `ReferenceError: window is not defined`.
- **Rapier WASM** — `@react-three/rapier` лениво инициализирует WASM. `<Physics>` нужно обернуть в `<Suspense>`. Критично для bundle size — WASM ~400KB gzipped.
- **meshline ESM** — Пакет `meshline` только ESM. Нужно убедиться что Next.js его транспилирует (обычно работает, но может потребоваться `transpilePackages: ['meshline']` в next.config.ts).
- **React refs для RigidBody** — Joint хуки (`useRopeJoint`, `useSphericalJoint`) принимают `RefObject<RapierRigidBody>`. Нельзя использовать refs после unmount. При динамическом изменении количества бусин (add/remove) нужно пересоздавать компоненты — React key по bead id.
- **Стабильность цепочки** — При быстром перетаскивании с weak solver может «разлететься». Решения: (1) `linearDamping={2} angularDamping={2}` на каждом теле, (2) `timeStep={1/60}` фиксированный шаг, (3) `gravity={[0, -40, 0]}` (больше гравитация = меньше дрейф).

## Common Pitfalls

- **Не использовать kinematicPosition для drag** — Если пытаться менять position напрямую через `setTranslation` каждый кадр, физика будет «бороться» и тело дёргаться. Правильный подход: `setBodyType('kinematicPosition')` + `setNextKinematicTranslation()` — Rapier понимает что тело управляется извне и не применяет к нему solver forces.
- **Не передавать velocity при отпускании** — Если просто переключить обратно на `type='dynamic'` без `setLinvel()`, бусина «замёрзнет» и упадёт как камень. Нужно вычислить velocity из delta position/rotation за последние кадры и передать через `setLinvel()` + `setAngvel()` (Vercel pattern).
- **Забыть wakeUp()** — Rapier засыпает тела при покое. При старте drag нужно вызвать `ref.current.wakeUp()` на цепочке. Иначе первое перетаскивание не сработает.
- **Рендерить CatmullRomCurve3 из stale positions** — Позиции тел обновляются физикой, а MeshLine пересчитывается в useFrame. Нужно каждый кадр обновлять curve.points из `rigidBody.translation()` — это тоже Vercel pattern.
- **SSR без dynamic import** — Если добавить `<Canvas>` напрямую в page.tsx без `"use client"` + `dynamic(ssr: false)`, Next.js попытается отрендерить на сервере и упадёт.

## Open Risks

- **Стабильность при 30+ бусинах** — Длинная цепочка с rope joints может быть нестабильной при быстрых жестах. Митигация: damping + fixed timestep. Если не поможет, можно ограничить количество бусин или использовать меньший timeStep (1/120).
- **MeshLine с dynamic бусинами** — Если бусины добавляются/удаляются, CatmullRomCurve3 needs recalculation. Это управляемо через key-based rerender.
- **Next.js + Three.js bundle size** — three.js ~600KB + rapier WASM ~400KB. Для S01 (десктоп) — не критично, но S02 займётся оптимизацией для мобильных.
- **Тип RigidBody в Vercel pattern** — Vercel использует `type={dragged ? 'kinematicPosition' : 'dynamic'}` как prop. В react-three-rapier можно менять тип через `setBodyType()` — нужно проверить какой подход стабильнее.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| React/Next.js | react-best-practices | installed (loaded) |
| Frontend design | frontend-design | installed (loaded) |

## Sources

- Vercel 3D badge architecture: rope joints + kinematic drag + MeshLine (source: [Building an interactive 3D event badge with React Three Fiber](https://vercel.com/blog/building-an-interactive-3d-event-badge-with-react-three-fiber))
- React Three Rapier joints API: useRopeJoint, useSphericalJoint, useFixedJoint (source: [react-three-rapier README](https://github.com/pmndrs/react-three-rapier))
- Drag pattern with RigidBody: kinematicPosition + setNextKinematicTranslation (source: [react-three/handle gist](https://gist.github.com/bbohlender/f34bc5d5b2e2c2612f8b37cba03cc093))
- React Three Fiber pointer events: onPointerDown/Up/Move (source: [R3F events docs](https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/events.mdx))
- drei: Environment, ContactShadows, Stage (source: [drei README](https://github.com/pmndrs/drei))
