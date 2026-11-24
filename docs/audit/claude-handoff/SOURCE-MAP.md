# Карта исходников и интеграций

## Стек и границы

Версии ниже взяты из baseline package manifests. Проверяй фактическое разрешение
через `yarn.lock`, отдельные app workspaces и Expo compatibility tooling.

| Слой | Baseline | Где исследовать |
| --- | --- | --- |
| Runtime/tooling | Node 22.14.0, Yarn 4.9.4, Turbo 2.11.2, Biome 2.5.14 | `.nvmrc`, `package.json`, `yarn.lock`, `turbo.json`, `biome.json` |
| Мастер | Expo 57.0.24, RN 0.86.3, React 19.2.3, TS ~6.0.3 | `apps/mobile/package.json`, `apps/mobile/App.tsx` |
| Клиентская запись | Next.js 16.3.5, React 19.3.0, TS 5.9.3 | `apps/booking-web/package.json`, `apps/booking-web/app/page.tsx` |
| Backend | Supabase JS 2.116.0, PostgreSQL, SQL RPC, Edge Functions | `supabase/`, `packages/api/src/` |
| Локальный BE | Supabase CLI 2.117.0 и Docker | root scripts, `supabase/config.toml` |
| Тесты | Vitest 5.0.1, Playwright 1.63.0, Deno 2.x в CI | package manifests, `tests/e2e/`, `.github/workflows/ci.yml` |

Manifest-версии мобильного и web React/TS различаются. Оцени разрешение зависимостей,
совместимость React Native/Expo, пакетные границы, peer warnings, уязвимости,
поддерживаемые runtime и лицензии. Не обновляй всё до latest в процессе аудита.

`apps/mobile` и `apps/booking-web` владеют представлением и platform adapters.
`packages/domain` содержит чистые состояния и переходы, `validation` — входные
контракты, `i18n` — словари/форматирование, `api` — типизированную границу данных,
`analytics` — разрешённые события. SQL выполняет критичные проверки разрешений,
доступности, конфликтов и транзакций. TypeScript-тип не заменяет проверку SQL.

## Карта пользовательских поверхностей

| Поверхность | Реализация | Главные вопросы |
| --- | --- | --- |
| Старт и авторизация | `apps/mobile/App.tsx`, `src/screens/AppLaunchScreen.tsx`, `AuthScreen.tsx`, `PasswordRecoveryScreen.tsx`, `src/features/auth/` | Restoring, secure storage, callback, expired link, resend cooldown, восстановление после reload/background |
| Первичная настройка | `src/screens/SetupScreen.tsx`, `src/screens/setup/`, `src/features/workspace/` | Все поля и валидация, draft, timezone, первый service source locale, повтор после частичного сбоя |
| Today | `src/screens/dashboard/TodayTab.tsx` | Очерёдность запросов/сводки/расписания, пустые и прошлые дни, single primary action |
| Календарь | `CalendarTab.tsx`, `DayTimeline.tsx`, `WeekCalendar.tsx`, `MonthCalendar.tsx`, `CalendarMonthPickerSheet.tsx`, `src/features/calendar/` | Range/cache invalidation, соседние месяцы, временные границы, realtime, touch targets, now line |
| График | `src/features/availability/`, `src/components/`, SQL migrations | Weekly rules, date overrides, личные блоки, выбранные даты, сохранение существующих визитов |
| Создание и изменение визита | `src/features/appointments/`, связанные `src/components/` | Multi-service ordering/snapshots, клиент, время, сумма, notes, series, отмена и оплата |
| Свободные окна | `src/features/appointments/shareFreeSlotsImage*`, `freeSlotsDateRange.ts`, связанные компоненты | Картинка, системный share, диапазон и timezone, возвращение к созданию записи |
| Клиенты | `CustomersTab.tsx`, `src/features/customers/`, связанные компоненты | Pagination/search, история до 200 визитов, tel/sms, заметки и anonymization |
| Финансы | `FinancesTab.tsx`, `src/features/finance/`, `packages/api/src/financeReport.integration.test.ts` | Server aggregate, даты включительно, paid/expected, timezone, mixed currency, >1000 визитов |
| Профиль/услуги | `ProfileTab.tsx`, `src/features/services/`, `src/features/workspace/` | Доступность услуг, языки, manual/AI drafts, независимость от сложного графика |
| Public booking | `apps/booking-web/app/page.tsx`, `src/components/PublicServicePicker.tsx` | Workspace identity, несколько услуг, шаг/notice, доступность и конкурентная отправка |
| Клиентская ссылка | `src/components/CustomerAppointmentPage.tsx`, `docs/security/customer-appointment-links.md` | Scoped tokens, fragment URLs, confirm/cancel, expiry, revoked/replayed tokens |

Мобильные пути `src/...` в таблице относительны к `apps/mobile/`.
Имена компонентов ищи через `rg --files apps/mobile/src/components`.

## Backend и SQL

Прочитай все миграции по порядку. Для повторно определённых RPC анализируй
последнюю активную сигнатуру, `search_path`, grants, RLS, ownership и вызываемые
внутренние функции. Не оценивай безопасность по первой миграции с таким именем.

Основные группы включают `list_master_*`, `get_master_*`,
`create_public_booking_with_services`, операции ручной/повторяющейся записи,
графика, статусов, оплаты, управления клиентской ссылкой и анонимизации.
Полный список литеральных ссылок `.rpc(...)` и inventory миграций есть в JSON.
Динамически сформированные обращения такая выборка может пропустить.

Изучи `supabase/seed.sql`, `packages/api/src/supabase/database.types.ts`,
`packages/api/src/supabase.integration.helpers.ts` и integration suites.
Схема должна подниматься с нуля и проходить `supabase:types` без незакоммиченного
расхождения. Ранее дрейф RPC/колонок между main и hosted вызывал HTTP 400/404
и экран ошибки загрузки workspace. Подстановка demo маскирует такую проблему.

## Интеграционные точки

| Интеграция | Что есть в коде | Что остаётся проверить в среде |
| --- | --- | --- |
| Supabase Auth | Password sign-in, confirmation/recovery flows, templates, native callback | SMTP, hosted redirect allowlist, ссылка на холодном iPhone, refresh/revoke session |
| Booking emails | `supabase/functions/send-booking-decision-emails`, transactional outbox, prepare/finish, retries | Sender/DNS, delivery flag, budgets, Cron/Vault, настоящая доставка на контролируемый inbox |
| Provider webhook | `supabase/functions/booking-email-webhook`, signature verification and event handling | Signed callback от провайдера, dedup/order, реальные bounce/complaint states |
| AI translations | `supabase/functions/translate-service-content`, quota, validation, diagnostics | Server credentials, gateway/user auth, model/pricing, global budget and сохранение проверенного результата |
| Budget alerts | `supabase/functions/send-platform-budget-alerts`, budget/usage/outbox SQL | Owner mailbox, scheduler, working delivery и наблюдаемость самого отказа email |
| Queue health | `scripts/operations/email-queue-health.mjs`, private aggregate RPC | Независимый scheduler/alert receiver, остановка worker, heartbeat при пустой очереди |
| Analytics | `packages/analytics/`, app `lib/analytics.ts`, event contract | Текущая настройка PostHog, разрешённые свойства, доставка и отсутствие PII |
| Realtime | `apps/mobile/src/features/realtime/` и consumers | Изменения с другого клиента, reconnect, foreground refresh и нет повторных подписок |
| Recovery/retention | Outbox cleanup, token/usage cleanup, локальный restore probe | Реальная доступность backups, clean restore, ACL/RLS и повторная анонимизация после старого snapshot |
| Native delivery | `app.json`, `assets/`, `eas.json`, `testflight-pilot.md` | Project link, bundle ID, signing, App Store Connect, iPhone installation |

Три Edge Functions используют gateway JWT. У webhook gateway JWT отключён,
аутентификация выполняется подписью callback. Это намерение config/workflow,
сравни его с эффективным поведением и негативными тестами.

## Данные и особые контракты

- Таймзона workspace определяет локальные дни, часы, отчётный диапазон и
  пригодность услуги. Тестируй DST в Europe/Prague и сутки около полуночи.
- Для календаря одновременно важны appointment lifecycle и физический
  занятый интервал. Отменённая карточка ранее блокировала свободный target.
- Цены/длительности визита сохраняются snapshots. Редактирование каталога не
  должно переписать прошлые визиты и финансовую историю.
- У анонимизированного клиента могут оставаться записи и суммы. Проверяй
  отсутствие PII в связанных сущностях, outbox и активных токенах.
- Подтверждение, отмена, изменение графика, запись на несколько услуг,
  обработка webhooks и бюджета должны выдерживать повтор и конкурентность.
- Принятие письма провайдером и получение письма клиентом — отдельные состояния.
- Лимит 20 AI-запросов на workspace и общий финансовый лимит платформы —
  отдельные механизмы. Seed глобальных бюджетов отключает обращения до настройки.

## Документы для углубления

| Вопрос | Источник |
| --- | --- |
| Организация кода | `AGENTS.md`, `docs/architecture/code-organization.md` |
| Дизайн | `docs/design/DESIGN.md`, `design-tokens.json`, `docs/architecture/ui-conventions.md`, `apps/mobile/src/theme/` |
| Старые UI findings | `docs/design/final-mobile-design-audit.md`, `mobile-ux-backlog.md`, `design-review.md` |
| Backend release | `docs/operations/backend-release.md`, `.github/workflows/deploy-backend.yml`, `scripts/deployment/` |
| Emails | `docs/operations/appointment-email-events.md`, `booking-decision-email-production.md`, `email-delivery-webhooks.md`, `docs/security/booking-decision-email.md` |
| Auth templates | `supabase/AUTH_CONFIRMATION.md`, `scripts/email/`, `supabase/templates/` |
| AI и бюджет | `docs/operations/ai-service-translations.md`, `platform-integration-budgets.md` |
| Recovery | `docs/operations/local-restore-drill.md`, `integration-retention-inventory.md` |
| Finance | `docs/operations/finance-report-contract.md` |
| Privacy/links | `docs/security/customer-data-anonymization.md`, `customer-appointment-links.md`, `master-booking-requests.md` |
| Analytics | `docs/analytics/event-contract.md`, `pilot-dashboard.md`, `docs/operations/product-analytics.md` |
| Coverage/acceptance | `docs/operations/core-scenario-test-coverage.md`, `pilot-release-acceptance.md`, `testflight-pilot.md` |

Читай даты и revision в этих документах. Утверждение из старого документа
может быть уже изменено последующей миграцией или PR.
