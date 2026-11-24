# Воспроизводимая проверка и границы аудита

## Baseline

До установки зависимостей запиши `git status --short`, `git rev-parse HEAD`,
`git log -5 --oneline`, Node/Yarn/Docker/Deno/Xcode версии и свободные порты.
Сравни baseline с `origin/main` при доступной сети. Сохрани локальные изменения
владельца. Не используй `git clean` или общий reset. Отдельные эксперименты
делай в изолированном checkout либо явно показывай свой diff.

При передаче присутствовали незакоммиченные `.DS_Store`, `.superpowers/` и
сгенерированные booking-web инструкции. Они не входят в audited product baseline.
Не коммить их вместе с результатами и не удаляй пользовательские файлы.

Ниже команды из репозитория. Прочитай их реализации перед запуском, особенно
операции с БД. На первом этапе нужен локальный аудит на синтетических данных.
Hosted-проверки ограничь чтением доступной конфигурации без извлечения секретов.
Для hosted-записей, отправки настоящих писем, платных AI-запросов, deploy,
изменения DNS и настроек аккаунтов требуется отдельный согласованный scope.

## Безопасность данных проверки

- Динамические атаки и fuzzing выполняй на disposable loopback Supabase с двумя
  синтетическими workspace, разными пользователями и клиентами.
- Для concurrency запускай ограниченное число запросов, достаточное для PoC.
  Не атакуй доступность общего hosted проекта и сервисов конкурентов.
- Значения `.env`, service-role/API keys, raw manage tokens и пользовательские
  записи не включай в отчёты, screenshots, shell tracing и commit.
- Фикстурные токены и provider signatures в тестах отличай от действующих
  credentials. Исторический secret-scanning alert в webhook-тесте был закрыт
  владельцем. Его значение не входит в пакет. При новом подозрении установи
  происхождение, reachability и реальное влияние, сохрани только путь и тип.
- `yarn supabase:reset` разрушает локальные данные. До reset сверь loopback и
  убедись, что это экземпляр для аудита. Не используй `--linked` для reset.
- Не ослабляй permission/RLS, бюджеты или негативные тесты для получения green.
  Провайдеры и настоящие mailbox должны оставаться вне обычного локального CI.

## Базовые команды

```sh
corepack enable
yarn install --immutable
yarn format:check
yarn biome:lint
yarn typecheck
yarn lint
yarn test
yarn deployment:test
yarn operations:test
yarn email:check
yarn build
```

Сохраняй exit code и краткие итоги. `yarn test` использует Turbo cache, а SQL
integration suites могут пропускаться без credentials. Для нового независимого
результата укажи cache hits и при необходимости используй `yarn turbo run test
--force`. Не суммируй число тестов из cached logs как новый прогон.

Manifest dependency audit, peer compatibility и лицензии оцени отдельно.
`yarn npm audit --all --recursive` требует сети и может давать advisories на
dev-only пути. Для каждой существенной записи проверь разрешённую версию,
используемый путь и влияние на сборку/production, зафиксируй дату advisory.

## Browser suites

```sh
yarn playwright install chromium
BOOKING_E2E_PORT=3191 CI=1 yarn playwright test --config=playwright.config.ts
MOBILE_E2E_PORT=19191 CI=1 yarn playwright test --config=playwright.mobile.config.ts
AUTH_E2E_PORT=19192 CI=1 yarn playwright test --config=playwright.auth.config.ts
```

Используй свободные порты. Проверяй output webServer и версии конфигураций,
чтобы тест не подключился к чужому локальному серверу. Эти suites включают
demo/mocked RPC и Auth. Отмечай реальный или подменённый BE для каждого кейса.

Для UI проверь узкий экран 375 px, более широкий iPhone и desktop booking web.
Сохрани screenshots ключевых состояний, доступность текста/кнопок и фактическое
поведение keyboard/scroll/focus. Тест в mobile-web не устанавливает поведение
нативных date picker, SecureStore, share sheet, tel/sms и deep links.

## Реальная локальная БД

```sh
yarn supabase:start
# Только после подтверждения disposable локального экземпляра.
yarn supabase:reset
npx supabase@2.117.0 db lint --local
```

Следующий блок получает credentials локальной фикстурной БД в процесс.
Не печатай результат `status -o env` и не включай `set -x`.
Повтори в shell, откуда запускается соответствующий тест.

```sh
eval "$(npx supabase@2.117.0 status -o env)"
SUPABASE_URL="$API_URL" \
SUPABASE_PUBLISHABLE_KEY="$ANON_KEY" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" yarn test:integration
```

Перед real-backend E2E CI сбрасывает ту же disposable БД. Это исключает
загрязнение IP rate limit предыдущими integration tests.

```sh
yarn supabase:reset
eval "$(npx supabase@2.117.0 status -o env)"
REAL_BACKEND_E2E=1 SUPABASE_URL="$API_URL" \
SUPABASE_PUBLISHABLE_KEY="$ANON_KEY" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" yarn test:e2e:real
yarn supabase:types
git diff --exit-code -- packages/api/src/supabase/database.types.ts
```

Конфигурация real-backend требует opt-in и loopback URL. Её app servers
используют 3102 и 19057. Service role нужен тестовому процессу. Проверь,
что ни один клиентский bundle или public runtime его не получает.

Auth mail-capture проверки выполняются по командам из
`.github/workflows/ci.yml` через `scripts/email/check-auth-capture.mjs` и
`check-auth-recovery.mjs`. Они проверяют локальный mail catcher на 54324.

Edge Function контракты запускаются отдельно от Vitest.

```sh
deno test supabase/functions/_shared \
  supabase/functions/send-booking-decision-emails \
  supabase/functions/booking-email-webhook \
  supabase/functions/send-platform-budget-alerts \
  supabase/functions/translate-service-content
```

Следуй флагам текущего CI при изменении scripts. Если Deno или Docker
недоступны, запиши BLOCKED_ENV и продолжай статические/доступные проверки.
Подмена runtime и чтение тестового файла не считаются выполнением этой команды.

## Что должен попытаться опровергнуть adversarial agent

| Гипотеза | Минимальная проверка |
| --- | --- |
| Workspace isolation выдерживает прямой API | User A вызывает каждый чувствительный RPC для workspace B, чужого customer/appointment/service, включая private/internal функции через API. Проверь RLS и grants, подделку request/JWT headers. |
| Нельзя обойти решение мастера | Pending public booking, угадывание/подмена ID и client management token, прямые RPC и повторная отправка старой ссылки. |
| Slot нельзя занять дважды | Одновременная public/manual/multi-service/recurring запись, запись против break/closure/reschedule. Успех одного запроса не должен оставить вторую активную коллизию. |
| Длительность целиком помещается | Длинная услуга в коротком gap, несколько услуг через break, смещение шага, duplicate service IDs, удалённая/неактивная услуга, изменённый catalog после выбора. |
| Время согласовано | Notice boundary, точная граница соседних визитов, DST Europe/Prague, полночь и смена timezone, past dates, interval вне UI presets. |
| Повторы безопасны | Идемпотентный повтор с тем же payload и конфликт с другим payload, network retry после commit, серия с одной конфликтной датой. |
| Email не утекает/не дублируется | Pending receipt без bypass management link, recipient/consent/status меняются после claim, stale worker, failure после provider acceptance, webhook replay/out-of-order, anonymization в гонке. |
| AI не тратит вне бюджета | Чужой workspace, превышение квоты параллельными запросами, kill switch, timeout/429/invalid JSON, oversized input, ошибки pricing config. Только fake provider локально. |
| Отчёт не врёт | Частичная оплата, дата визита против даты сохранения, отменённые/no-show, future expected, >1000 visits, разные валюты и локальные midnight boundaries. |
| Удаление клиента действительно убирает PII | Notes, normalized contacts, queued jobs, waiting list, management tokens, обновление открытой карточки и другой вкладки. |
| Восстановление сохраняет доступ | Owner/ACL/RLS после restore, анонимизация и revoke до/после snapshot. Не использовать `--no-acl` как доказательство безопасного recovery. |
| Analytics и rendering не раскрывают данные | Allowlists, raw errors/URLs/HTML injection в service/name/note, management URL referrer, логи, preview emails и client bundles. |
| Приложение переживает сбои | Reconnect, logout/login, token expiry, foreground, несколько subscribers, устаревший cache после mutation, отменённый event перекрывает tap. |

Для каждой попытки фиксируй предпосылки, input, expected/actual, SQL/API/UI
доказательство и reachability. Отрицательная попытка тоже является результатом.
Уязвимость не считается воспроизведённой по одному подозрительному фрагменту SQL.

## Текущие уровни evidence

До этой передачи исторически прошли PR CI и локальные сценарии, перечисленные
в `core-scenario-test-coverage.md`. Проверка этого пакета сама по себе не
перезапускает продуктовый набор. Собственные результаты аудита сохрани отдельно.

Доступный code snapshot содержит app icon, splash, EAS store profile и callback
scheme, но явный финальный iOS bundle ID и Expo project link надо сверить.
При необходимости запусти экспорт iOS bundle и `expo prebuild` в scratch
директории. Такие действия проверяют bundling/config, а подписанный архив,
TestFlight и физический iPhone требуют отдельного evidence.

Live acceptance должна включать идентификаторы сборки и BE revision, hosted
Auth, прямую публичную ссылку, фактическую доставку и webhook, AI budget
configuration, наблюдаемость и восстановление. Если интеграция пока выключена,
укажи влияние на конкретный этап пилота и продуктовый путь.
