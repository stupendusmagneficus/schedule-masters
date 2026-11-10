# Core scenario test coverage (SCH-160)

Inventory of existing automated tests at main revision `73c57dc`, reviewed on
2026-11-10. A listed test is evidence of a specific checked behavior, not proof
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
- `yarn test:e2e:real`: booking-web against a disposable local Supabase. It is
  explicitly opted in and restricted to loopback URLs. CI resets its isolated
  database before this test to avoid cross-suite rate-limit contamination.
- The booking email worker job runs Deno tests for Edge Functions with simulated
  providers. Separate local mail-capture scripts exercise Supabase Auth templates
  in the migrations job, without a real external inbox.

## Coverage map

| Scenario | Existing automated evidence | Remaining acceptance gap |
| --- | --- | --- |
| Sign-in and recovery | `tests/e2e/auth-web.spec.ts`; `apps/mobile/src/features/auth/*.test.ts`; `scripts/email/check-auth-capture.mjs` and `check-auth-recovery.mjs` | Hosted Auth redirects, real inbox and native iPhone deep links are not established by these tests. |
| Workspace setup and settings | `apps/mobile/src/features/workspace/*.test.ts`; `packages/api/src/workspacePreferences.integration.test.ts`; settings RPC in `supabase.integration.test.ts` | No identified complete signup → setup UI → real local backend journey. |
| Services and translations | `apps/mobile/src/features/services/serviceCatalog.test.ts`; service permissions in `supabase.integration.test.ts`; `supabase/functions/translate-service-content/index.test.ts` | No identified end-to-end edit/save across locales in the mobile UI with a real backend, or live OpenAI acceptance. |
| Availability, overrides and breaks | `apps/mobile/src/features/availability/*.test.ts`; booking interval and one-off override tests in `supabase.integration.test.ts` | Review UI → real backend coverage for bulk changes and break editing; no native device proof. |
| Public multi-service request | `tests/e2e/real-booking.spec.ts`; multi-service and boundary tests in `supabase.integration.test.ts`; `bookingLocales.integration.test.ts` | Real-backend browser test uses one locale; it does not test hosted deployment or the native master UI. |
| Manual multi-service appointment | `tests/e2e/real-booking.spec.ts`; `apps/mobile/src/features/appointments/manualBooking*.test.ts`; manual multi-service RPC in `supabase.integration.test.ts` | Browser journey creates a new customer and checks the ordered services, totals, calendar and public availability; native iPhone is not covered. |
| Decision, cancellation and released slot | `tests/e2e/real-booking.spec.ts`; status lifecycle in `supabase.integration.test.ts` | Confirmation and cancellation use mobile web UI against local Supabase; customer-facing email delivery and native device are not exercised. |
| Recurring visits | Series cancellation/history test in `supabase.integration.test.ts` | Review creation, conflict and cancellation paths end-to-end through mobile UI and real backend. |
| Client directory, history and privacy | `apps/mobile/src/features/customers/*.test.ts`; customer directory/history and management-link RPCs in `supabase.integration.test.ts`; `docs/operations/local-restore-drill.md` | Restore probe uses synthetic data and the same local server; old snapshots, hosted recovery and end-to-end UI remain separate acceptance work. |
| Finance for a selected period | `apps/mobile/src/features/finance/*.test.ts`; `packages/api/src/financeReport.integration.test.ts` | Review selected range and payment updates through mobile UI against real backend. |
| Email events and delivery | `packages/api/src/appointmentEmailEvents.integration.test.ts`; `emailDelivery.integration.test.ts`; `supabase/functions/send-booking-decision-emails/*.test.ts` | Provider is simulated in automated worker tests; real domain, worker, inbox and webhook acceptance remain SCH-146. |
| AI-assisted service translation | `supabase/functions/translate-service-content/index.test.ts`; `platformIntegrationBudgets.integration.test.ts` | Provider is simulated; real provider, deployment, budget and saved translations remain SCH-148. |
| Five locales | `packages/api/src/bookingLocales.integration.test.ts`; `packages/i18n/src/index.test.ts`; selected Playwright locale cases | These do not establish all five full user journeys or native rendering. |

## Prioritized follow-up

1. Review availability changes and client history through the mobile UI with a
   real backend; verify that cancelled events do not obstruct released times
   (SCH-161).
2. Audit signup/setup, service translation saving, recurring visits and finance
   paths against behavior-focused tests; add targeted coverage for actual gaps.
3. Run the supported CI layers without cached results and record the exact
   revision. Real provider/inbox and native-device acceptance stay in SCH-157,
   SCH-146 and SCH-148; do not point destructive local fixtures at hosted data.

This inventory identifies evidence and gaps. It does not assert that every
listed suite was executed during the inventory or that SCH-160 is complete.
