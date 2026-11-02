# Booking browser test with local Supabase

This test exercises booking-web in a browser against a real local Supabase
instance. It creates an isolated test workspace and owner, submits a public
multi-service request, confirms and cancels it as the owner, and checks that the
slot becomes available again. Requests are not mocked. No email worker or AI
provider is called.

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
executes this scenario after the integration tests on its disposable database.

The owner action is an authenticated API call, not the mobile interface. This
does not verify mobile UI, deployed infrastructure, provider delivery, email
inbox, device behavior, or all five locales. These remain separate acceptance
work for SCH-157.
