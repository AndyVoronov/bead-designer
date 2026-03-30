# Requirements

This file is the explicit capability and coverage contract for the project.

Use it to track what is actively in scope, what has been validated by completed work, what is intentionally deferred, and what is explicitly out of scope.

Guidelines:
- Keep requirements capability-oriented, not a giant feature wishlist.
- Requirements should be atomic, testable, and stated in plain language.
- Every **Active** requirement should be mapped to a slice, deferred, blocked with reason, or moved out of scope.
- Each requirement should have one accountable primary owner and may have supporting slices.
- Research may suggest requirements, but research does not silently make them binding.
- Validation means the requirement was actually proven by completed work and verification, not just discussed.

## Active

### R001 — 3D-физика цепочки бусин
- Class: core-capability
- Status: active
- Description: Цепочка бусин на нити с реалистичной физикой — гравитация, провисание нити (rope/spring joints), столкновения бусин между собой. Бусины можно перетаскивать мышкой/пальцем вдоль нити и по сцене.
- Why it matters: Ядро продукта. Без реалистичной физики изделие не вызывает эмоцию «потрогать».
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S03
- Validation: unmapped
- Notes: Используем React Three Rapier (WASM). Rope joints между бусинами, spring joints для упругости нити. Должно работать стабильно с 20-40 бусинами на цепочке.

### R002 — Мобильная адаптивная отрисовка
- Class: quality-attribute
- Status: active
- Description: 3D-сцена плавно работает на мобильных устройствах. Адаптивное качество рендеринга — на мощных телефонах максимум красоты, на слабых — упрощённо но стабильно 30+ FPS.
- Why it matters: Основная масса клиентов — с телефона. Тормозящий 3D убьёт конверсию.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S07
- Validation: unmapped
- Notes: PerformanceMonitor из R3F, dynamic DPR, on-demand rendering при статике. Пост-обработка (SSGI) отключается на слабых устройствах.

### R003 — Реалистичные материалы бусин из PNG
- Class: differentiator
- Status: active
- Description: Бусины отображаются с реалистичными PBR-материалами, отличающими дерево, силикон, вязаное и другие материалы. Текстуры загружаются из PNG-изображений, предоставленных пользователем.
- Why it matters: Визуальная привлекательность — главная ценность. Без реалистичных материалов 3D выглядит дёшево.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03
- Validation: unmapped
- Notes: Нужно deriving normal/roughness maps из фотографий или ручная настройка PBR-параметров для каждого материала.

### R004 — Каталог бусин со свойствами
- Class: core-capability
- Status: active
- Description: Просматриваемый каталог бусин (~100 видов) с их свойствами: размер, форма (шар, диск, фигурные), материал (дерево, силикон, вязаное), PNG-изображение. Бусины можно фильтровать и листать.
- Why it matters: Клиенту нужно выбирать из доступных бусин. Без каталога редактор бесполезен.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: unmapped
- Notes: Бусины хранятся в БД. PNG-текстуры — в файловой системе или CDN. Ленивая загрузка текстур для производительности.

### R005 — Интерактивный редактор (добавить/удалить/перетащить)
- Class: primary-user-loop
- Status: active
- Description: Пользователь может добавлять бусины из каталога на цепочку, удалять бусины, менять порядок перетаскиванием. Первый тип изделия — держатель для соски (зажим на одном конце, нить с бусинами). Мобильный UI с тач-жестами.
- Why it matters: Основной пользовательский цикл. Без этого клиент не может создать изделие.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: unmapped
- Notes: Добавление бусины → создаётся RigidBody с rope joint к соседней. Удаление → разрыв joint, перерасчёт цепи. Перетаскивание → temporary kinematic body.

### R006 — Шаблоны и шеринг уникальных кодов/ссылок
- Class: integration
- Status: active
- Description: Предустановленные шаблоны от админа (листаются в каталоге). Каждое изделие (и шаблон) = уникальный код/URL, по которому восстанавливается точная копия дизайна. Подтверждённые админом пользовательские изделия попадают в каталог шаблонов.
- Why it matters: Шаблоны — точка входа для клиентов. Шеринг — органический рост.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S06
- Validation: unmapped
- Notes: Сериализация массива бусин в компактный формат. Хранение в БД, генерация короткого кода. URL: /design/{code}.

### R007 — Заказ → БД + Telegram-уведомление
- Class: integration
- Status: active
- Description: Клиент нажимает «Заказать» → заказ сохраняется в базу данных → открывается Telegram с менеджером (t.me/VoronovAndrey) с предзаполненным сообщением, содержащим код изделия. Клиент не заполняет никаких полей.
- Why it matters: Конверсия. Минимальное трение: один тап → заказ → диалог.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: M001/S06
- Validation: unmapped
- Notes: Telegram deep link: https://t.me/VoronovAndrey?text=encoded_text. Заказ в БД содержит код изделия, таймстемп, статус.

### R008 — Админка: шаблоны, заказы, каталог
- Class: admin/support
- Status: active
- Description: Веб-панель для администратора: управление шаблонами (CRUD), просмотр заказов, подтверждение пользовательских дизайнов для добавления в каталог, управление бусинами. Доступ по простому паролю.
- Why it matters: Без админки невозможно управлять контентом и обрабатывать заказы.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: unmapped
- Notes: Deskt ориентирована. Может быть отдельным роутом в Next.js (/admin).

### R009 — Тип изделия: держатель для соски
- Class: core-capability
- Status: active
- Description: Первый тип изделия — держатель для соски. Включает зажим-клипсу на одном конце и нить с бусинами. Определяет структуру изделия и UI для выбора/конфигурации этого типа.
- Why it matters: Стартовый продукт. Доказывает концепцию конструктора для конкретного типа изделий.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: unmapped
- Notes: Клипса — фиксированный элемент, не бусина. Нить — визуальная компонента (可以是 rope joint). Дальше добавляются другие типы.

### R010 — Развёртывание на VPS reg.ru
- Class: constraint
- Status: active
- Description: Приложение развёрнуто и доступно по URL на VPS reg.ru. Production-сборка, HTTPS, автозапуск.
- Why it matters: Продукт должен быть доступен клиентам в интернете.
- Source: user
- Primary owning slice: M001/S07
- Supporting slices: none
- Validation: unmapped
- Notes: Node.js-сервер на VPS. Docker или PM2. Nginx reverse proxy. HTTPS через certbot/Let's Encrypt.

### R011 — Красивый визуал и UX
- Class: differentiator
- Status: active
- Description: Визуально привлекательный интерфейс — мягкие цвета, продуманная типографика, плавные анимации, приятные переходы. 3D-сцена с красивым освещением и тенями. Всё должно выглядеть «потрясающе».
- Why it matters: Эмоциональный отклик клиента. Цель — чтобы клиент влюбился в изделие.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S02, M001/S03, M001/S07
- Validation: unmapped
- Notes: Это сквозное требование — влияет на каждый слайс. SSGI, ambient occlusion, мягкие тени, продуманная палитра.

## Validated

_(none yet)_

## Deferred

### R012 — Дополнительные типы изделий
- Class: core-capability
- Status: deferred
- Description: Другие виды игрушек из бусин помимо держателя для соски. Добавляются по одному после запуска.
- Why it matters: Расширение ассортимента продукции.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Архитектура S01-S04 должна быть достаточно гибкой для добавления новых типов без переработки.

### R013 — Онлайн-оплата
- Class: integration
- Status: deferred
- Description: Интеграция платёжной системы для оплаты заказов онлайн.
- Why it matters: Увеличение конверсии за счёт мгновенной оплаты.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Сейчас заказ → Telegram-диалог с менеджером. Оплата обсуждается отдельно.

### R014 — Аутентификация пользователей
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

### R015 — Десктоп-first опыт
- Class: constraint
- Status: out-of-scope
- Description: Приоритетная оптимизация под десктоп. Мобильный — основной таргет.
- Why it matters: Предотвращает waste на оптимизации десктопного UX в ущерб мобильному.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Десктоп работает, но не оптимизируется отдельно.

### R016 — Нативные мобильные приложения
- Class: anti-feature
- Status: out-of-scope
- Description: iOS/Android приложения. Только мобильный веб.
- Why it matters: Нативные приложения — другой масштаб усилий. PWA может быть рассмотрен позже.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: React Three Fiber + WASM работают в мобильных браузерах. Нативы не нужны.

### R017 — Мультиязычность
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
| R001 | core-capability | active | M001/S01 | M001/S03 | mapped |
| R002 | quality-attribute | active | M001/S02 | M001/S07 | mapped |
| R003 | differentiator | active | M001/S02 | M001/S03 | mapped |
| R004 | core-capability | active | M001/S03 | M001/S04 | mapped |
| R005 | primary-user-loop | active | M001/S03 | M001/S04 | mapped |
| R006 | integration | active | M001/S04 | M001/S06 | mapped |
| R007 | integration | active | M001/S05 | M001/S06 | mapped |
| R008 | admin/support | active | M001/S06 | none | mapped |
| R009 | core-capability | active | M001/S03 | M001/S04 | mapped |
| R010 | constraint | active | M001/S07 | none | mapped |
| R011 | differentiator | active | M001/S01 | M001/S02, M001/S03, M001/S07 | mapped |
| R012 | core-capability | deferred | none | none | unmapped |
| R013 | integration | deferred | none | none | unmapped |
| R014 | compliance/security | deferred | none | none | unmapped |
| R015 | constraint | out-of-scope | none | none | n/a |
| R016 | anti-feature | out-of-scope | none | none | n/a |
| R017 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 11
- Mapped to slices: 11
- Validated: 0
- Unmapped active requirements: 0
