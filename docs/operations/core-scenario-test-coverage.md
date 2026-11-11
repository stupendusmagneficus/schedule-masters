# Core scenario test coverage (SCH-160)

Inventory reviewed against main revision `5009ee5` on 2026-11-11.
[The CI run for PR #148](https://github.com/stupendusmagneficus/schedule-masters/actions/runs/42989263100)
passed the full local-Supabase browser suite on the PR head before merge.
That suite includes registration and workspace setup, manual service translation,
and recording payment. The customer erasure test was added in the follow-up
documented below.

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
| Workspace setup and settings | `apps/mobile/src/features/workspace/*.test.ts`; `packages/api/src/workspacePreferences.integration.test.ts`; settings RPC in `supabase.integration.test.ts`; `tests/e2e/real-onboarding.spec.ts` covers signup, sign-in, the saved weekly schedule, the first service source language, and public visibility. | Hosted confirmation and native deep links. The browser test confirms the synthetic account through the local admin API. |
| Services and translations | `apps/mobile/src/features/services/serviceCatalog.test.ts`; service permissions in `supabase.integration.test.ts`; `supabase/functions/translate-service-content/index.test.ts`; `tests/e2e/real-onboarding.spec.ts` verifies manual Czech name and description after saving, reloading, and switching back to English. | Live OpenAI acceptance and the other translation locales remain separate. |
| Availability, overrides and breaks | `tests/e2e/real-booking.spec.ts`; `apps/mobile/src/features/availability/*.test.ts`; booking interval and one-off override tests in `supabase.integration.test.ts` | Browser test covers closing and restoring one day, closing two selected dates, and creating, moving and deleting a break. Bulk reopening and native interactions remain unverified. |
| Public multi-service request | `tests/e2e/real-booking.spec.ts`; multi-service and boundary tests in `supabase.integration.test.ts`; `bookingLocales.integration.test.ts` | Real-backend browser test uses one locale; it does not test hosted deployment or the native master UI. |
| Manual multi-service appointment | `tests/e2e/real-booking.spec.ts`; `apps/mobile/src/features/appointments/manualBooking*.test.ts`; manual multi-service RPC in `supabase.integration.test.ts` | Browser journey creates a new customer and checks the ordered services, totals, calendar and public availability; native iPhone is not covered. |
| Decision, cancellation and released slot | `tests/e2e/real-booking.spec.ts`; status lifecycle in `supabase.integration.test.ts` | Confirmation and cancellation use mobile web UI against local Supabase; customer-facing email delivery and native device are not exercised. |
| Recurring visits | `tests/e2e/real-booking.spec.ts`; series cancellation/history test in `supabase.integration.test.ts` | The browser verifies creation, cancellation of future visits, and reopened slots. Series conflicts through the UI remain unverified. |
| Client directory, history and privacy | `tests/e2e/real-booking.spec.ts` verifies customer search, confirmed booking history and note persistence; `tests/e2e/real-customer-privacy.spec.ts` verifies deletion confirmation, exclusion from search, removal of profile and visit notes and contact data, and preservation of the completed visit and amounts; `apps/mobile/src/features/customers/*.test.ts`; customer directory/history and management-link RPCs in `supabase.integration.test.ts`; `docs/operations/local-restore-drill.md` | Hosted recovery from a previous snapshot. |
| Finance for a selected period | `tests/e2e/real-booking.spec.ts` checks exact custom-range dates and displayed expected revenue; `tests/e2e/real-payment.spec.ts` completes an appointment, records payment, and checks received revenue in the report and UI; `apps/mobile/src/features/finance/*.test.ts`; `packages/api/src/financeReport.integration.test.ts` | Completing a visit and recording payment on a native device. |
| Email events and delivery | `packages/api/src/appointmentEmailEvents.integration.test.ts`; `emailDelivery.integration.test.ts`; `supabase/functions/send-booking-decision-emails/*.test.ts` | Provider is simulated in automated worker tests; real domain, worker, inbox and webhook acceptance remain SCH-146. |
| AI-assisted service translation | `supabase/functions/translate-service-content/index.test.ts`; `platformIntegrationBudgets.integration.test.ts` | Provider is simulated; real provider, deployment, budget and saved translations remain SCH-148. |
| Five locales | `packages/api/src/bookingLocales.integration.test.ts`; `packages/i18n/src/index.test.ts`; selected Playwright locale cases | These do not establish all five full user journeys or native rendering. |

## Remaining acceptance work

1. Exercise bulk reopening and recurring-series conflict handling through the
   master UI. Extend the local browser journey to the other supported locales.
2. Verify hosted Auth redirects, deployed Supabase and booking-web, recovery
   from a previous snapshot, and the native iPhone flows under SCH-157.
3. Verify live email delivery and webhooks under SCH-146 and the deployed AI
   translation provider and budget controls under SCH-148.
