# Project

## What This Is

Веб-конструктор детских игрушек из бусин. Клиент на мобильном телефоне открывает сайт, выбирает готовый шаблон (например, держатель для соски) или собирает изделие с нуля — добавляет бусины разных форм, размеров и материалов на нить. 3D-редактор с реалистичной физикой: бусины провисают под гравитацией, сталкиваются, перетаскиваются пальцем. Один клик «Заказать» — заказ записывается в базу, открывается Telegram с предзаполненным сообщением менеджеру. Каждое изделие = уникальная ссылка для шеринга. Админка для управления шаблонами, заказами и каталогом.

## Core Value

Клиент должен «влюбиться» в изделие прямо в браузере. 3D-визуал с физикой — это ядро продукта. Если рендеринг и взаимодействие не вызывают эмоции, остальные функции бесполезны.

## Current State

S03 completed: Каталог бусин + редактор UI. 100 catalog beads with Russian names across 4 materials, filterable scrollable bottom-sheet catalog. Global Zustand useDesignStore connecting catalog/toolbar/3D scene. Tap-to-select in 3D (200ms/0.05 NDC threshold) with golden wireframe highlight. PacifierClip 3D mesh at chain anchor. Glass-morphism toolbar (Каталог/Удалить/Сброс). EditorCanvas replaces SceneLoader as app entry point. 44 tests pass, build clean. R004 and R009 validated. R005 partial (reorder deferred).

## Architecture / Key Patterns

- **Framework:** Next.js (App Router) — SSR, API routes, React-экосистема
- **3D:** React Three Fiber (R3F) + Three.js — декларативный 3D в React
- **Physics:** React Three Rapier — WASM-физика (rope joints, spring joints, collisions)
- **Rendering:** Адаптивный рендеринг (PerformanceMonitor, dynamic DPR) для мобильных
- **Materials:** PBR-материалы из PNG-текстур (дерево, силикон, вязаное)
- **Post-processing:** realism-effects (SSGI, HBAO) для красивого освещения
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** Tailwind CSS, mobile-first
- **State:** Zustand для 3D-состояния, React Query для серверного состояния
- **Deployment:** Node.js на VPS reg.ru

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: 3D-конструктор игрушек из бусин — Полный цикл: 3D-редактор с физикой, каталог, шаблоны, заказы, админка, деплой (S01-S03 complete, S04-S07 remaining)
