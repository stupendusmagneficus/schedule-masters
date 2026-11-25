# Privacy policy (draft)

The public booking site serves a **draft** privacy policy at `/privacy`, in
Czech and English on one page. It is not reviewed by a lawyer and is marked as
a draft on the page. The text lives in
`apps/booking-web/src/content/privacyPolicy.ts`; the booking page footer links
to it.

## Placeholders the owner must fill

`[OPERATOR NAME]`, `[IČO]`, `[ADDRESS]`, `[CONTACT EMAIL]`, `[EFFECTIVE DATE]`,
and `[RETENTION PERIOD – …]`. Every `[K OVĚŘENÍ …]` / `[TO VERIFY …]` marker
is a legal or operational assumption to confirm or rewrite.

## What to verify before publishing

- Controller/processor roles: Chvilio as controller for master accounts and
  analytics, processor for masters' client data. A data processing agreement
  (e.g. in the terms of service) is needed for the processor role.
- Legal basis for analytics: the booking page and app store a random analytics
  ID on the device (`localStorage`) without a consent prompt. Confirm with a
  lawyer whether Czech ePrivacy rules (§ 89 of Act 127/2005) require consent.
- Supabase region: `docs/operations/backend-release.md` records `eu-west-2`
  (London, UK), not an EU region. The policy relies on the UK adequacy decision.
- Vercel hosting region, PostHog IP/retention settings, Resend and OpenAI
  transfer mechanisms (US), and each provider's DPA.
- Retention not yet implemented: public booking IP rate-limit rows and booking
  idempotency records have no scheduled deletion
  (`docs/operations/integration-retention-inventory.md`). Hosted cleanup jobs
  and backup retention are unverified.
- Booking emails via Resend are described as not yet enabled; update the text
  when delivery is switched on.
- Remove `robots: { index: false }` in `apps/booking-web/app/privacy/page.tsx`
  and the draft notice once the text is approved.

## App Store Connect

App Store Connect requires a publicly reachable privacy policy URL for the app
(App Information → Privacy Policy URL). Use `https://<booking-domain>/privacy`
once the final text is published, and keep the App Privacy answers consistent
with this policy.
