# Core scenario test coverage (SCH-160)

Inventory of automated tests based on main revision `c408985` and the manual
translation E2E follow-up, reviewed on 2026-11-11. A listed test is evidence of a specific checked behavior, not proof
that the entire feature or production deployment works. Manual pilot testing is
additional evidence, not a replacement for automated regression coverage.

## CI test layers

- `yarn test`: package unit tests. Integration suites can skip without Supabase
  credentials; a passing unit job alone does not prove database behavior.
- `yarn test:integration`: integration suites against the disposable local
  Supabase started in the CI migrations job. CI supplies credentials explicitly.
- `yarn test:e2e`: Playwright booking-web, mobile-web and auth-web. Many cases
  use demo data or mocked RPC/auth responses; see each test before relying on it.
  Set `BOOKING_E2E_PORT` and `MOBILE_E2E_PORT` to unused ports when other local
  applications are running; otherwise Playwright may reuse an unrelated server.
- `yarn test:e2e:real`: booking-web and the master web UI against a disposable local Supabase. It is
  explicitly opted in and restricted to loopback URLs. CI resets its isolated
  database before this test to avoid cross-suite rate-limit contamination.
- The booking email worker job runs Deno tests for Edge Functions with simulated
  providers. Separate local mail-capture scripts exercise Supabase Auth templates
  in the migrations job, without a real external inbox.

## Coverage map

| Scenario | Existing automated evidence | Remaining acceptance gap |
| --- | --- | --- |
| Sign-in and recovery | `tests/e2e/auth-web.spec.ts`; `apps/mobile/src/features/auth/*.test.ts`; `scripts/email/check-auth-capture.mjs` and `check-auth-recovery.mjs` | Hosted Auth redirects, real inbox and native iPhone deep links are not established by these tests. |
| Workspace setup and settings | `apps/mobile/src/features/workspace/*.test.ts`; `packages/api/src/workspacePreferences.integration.test.ts`; settings RPC in `supabase.integration.test.ts`; `tests/e2e/real-onboarding.spec.ts` covers signup, sign-in, the saved weekly schedule, and the public first service. | The test confirms the synthetic account through the local admin API. Hosted confirmation and native deep links remain open. |
| Services and translations | `apps/mobile/src/features/services/serviceCatalog.test.ts`; service permissions in `supabase.integration.test.ts`; `supabase/functions/translate-service-content/index.test.ts`; `tests/e2e/real-onboarding.spec.ts` verifies manual Czech name and description after saving, reloading, and switching back to English. | Live OpenAI acceptance and the other translation locales remain separate. |
| Availability, overrides and breaks | `tests/e2e/real-booking.spec.ts`; `apps/mobile/src/features/availability/*.test.ts`; booking interval and one-off override tests in `supabase.integration.test.ts` | Browser test covers closing and restoring one day, closing two selected dates, and creating, moving and deleting a break. Bulk reopening and native interactions remain unverified. |
| Public multi-service request | `tests/e2e/real-booking.spec.ts`; multi-service and boundary tests in `supabase.integration.test.ts`; `bookingLocales.integration.test.ts` | Real-backend browser test uses one locale; it does not test hosted deployment or the native master UI. |
| Manual multi-service appointment | `tests/e2e/real-booking.spec.ts`; `apps/mobile/src/features/appointments/manualBooking*.test.ts`; manual multi-service RPC in `supabase.integration.test.ts` | Browser journey creates a new customer and checks the ordered services, totals, calendar and public availability; native iPhone is not covered. |
| Decision, cancellation and released slot | `tests/e2e/real-booking.spec.ts`; status lifecycle in `supabase.integration.test.ts` | Confirmation and cancellation use mobile web UI against local Supabase; customer-facing email delivery and native device are not exercised. |
| Recurring visits | `tests/e2e/real-booking.spec.ts`; series cancellation/history test in `supabase.integration.test.ts` | The browser verifies creation, cancellation of future visits, and reopened slots. Series conflicts through the UI remain unverified. |
| Client directory, history and privacy | `tests/e2e/real-booking.spec.ts` verifies customer search, confirmed booking history and note persistence; `apps/mobile/src/features/customers/*.test.ts`; customer directory/history and management-link RPCs in `supabase.integration.test.ts`; `docs/operations/local-restore-drill.md` | Restore probe uses synthetic data and the same local server; old snapshots, hosted recovery and the UI anonymization flow remain separate acceptance work. |
| Finance for a selected period | `tests/e2e/real-booking.spec.ts`; `apps/mobile/src/features/finance/*.test.ts`; `packages/api/src/financeReport.integration.test.ts` | The browser checks exact custom-range dates and displayed expected revenue. Recording payments through the UI remains unverified. |
| Email events and delivery | `packages/api/src/appointmentEmailEvents.integration.test.ts`; `emailDelivery.integration.test.ts`; `supabase/functions/send-booking-decision-emails/*.test.ts` | Provider is simulated in automated worker tests; real domain, worker, inbox and webhook acceptance remain SCH-146. |
| AI-assisted service translation | `supabase/functions/translate-service-content/index.test.ts`; `platformIntegrationBudgets.integration.test.ts` | Provider is simulated; real provider, deployment, budget and saved translations remain SCH-148. |
| Five locales | `packages/api/src/bookingLocales.integration.test.ts`; `packages/i18n/src/index.test.ts`; selected Playwright locale cases | These do not establish all five full user journeys or native rendering. |

## Prioritized follow-up

1. Add targeted local coverage for recording payments and customer
   anonymization through the master UI where database contracts alone are
   insufficient.
2. Run the supported CI layers without cached results and record the exact
   revision. Real provider/inbox and native-device acceptance stay in SCH-157,
   SCH-146 and SCH-148. Use isolated fixtures for destructive tests.

This inventory identifies evidence and gaps. It does not assert that every
listed suite was executed during the inventory or that SCH-160 is complete.
