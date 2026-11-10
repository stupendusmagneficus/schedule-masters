# Booking browser test with local Supabase

This test exercises booking-web in a browser against a real local Supabase
instance. It creates an isolated test workspace and owner, submits a public
multi-service request, signs in through the mobile web interface and confirms it
as the owner. It checks that the slot is occupied, then cancels the appointment
through the master's calendar and checks that the slot becomes available again.
It also creates a manual appointment for a new customer through the master UI,
checks the ordered services, total duration and price, and verifies that its
time is no longer offered publicly. Requests are not mocked. No email worker or
AI provider is called.

The master then closes the day and restores its weekly schedule through the UI.
The test checks that public slots disappear and return, and that the existing
confirmed appointment remains intact and continues to reserve its time.

Run against a disposable local project after applying migrations. The command
requires explicit opt-in and rejects non-loopback Supabase URLs; it creates and
deletes test data. The service role key is used only in the test process and is
cleared from the booking-web server process. Never use a remote or shared data
environment. Do not print credentials or enable shell tracing.

```sh
eval "$(npx supabase@2.117.0 status -o env)"
REAL_BACKEND_E2E=1 SUPABASE_URL="$API_URL" SUPABASE_PUBLISHABLE_KEY="$ANON_KEY" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" yarn test:e2e:real
```

Install the Playwright Chromium browser first if needed. The CI migrations job
resets its disposable local database between the integration tests and this
scenario. This keeps earlier tests from exhausting the per-IP booking limit;
the browser test still exercises the normal rate-limited endpoint.

This test uses the mobile web interface; it does not verify a native iPhone,
deployed infrastructure, provider delivery, email inbox, device behavior, or
all five locales. These remain separate acceptance work for SCH-157.
