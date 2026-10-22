# Email confirmation setup

## Local Supabase

The repository config uses the Expo web callback at
`http://localhost:8081/auth/callback`, the local public booking site at
`http://localhost:3000/**`, and the native callback
`schedulemasters://auth/callback`. The confirmation email template is
`supabase/templates/confirmation.html`. Local email confirmation is enabled;
new local accounts must open the captured email before signing in. Local mail
is captured by Mailpit at `http://127.0.0.1:54324`. The local-only email rate
limit allows the five-language test; it is not a hosted SMTP limit change.

Run the Expo app in a browser at `http://localhost:8081` and register there to
test the local email-confirmation loop. Supabase local mail is captured by its
local mail viewer; open the confirmation message in the same browser where
registration began so its PKCE verifier is available.

For iOS, use an installed development build with the `schedulemasters` scheme.
Changing the scheme requires rebuilding the native app; Expo Go does not register
this app's production scheme.

## Hosted Supabase project

Hosted project settings are not changed by `supabase/config.toml`. In
Authentication → URL Configuration:

1. Set Site URL to the approved production master-app origin that handles Auth
   callbacks. Do not use the separate public booking site as the Auth fallback.
2. Add the exact production booking-web URL(s) needed by the product.
3. Add the exact callback `schedulemasters://auth/callback`.
4. Add the local callback URLs only for development:
   `http://localhost:8081/auth/callback` and
   `http://127.0.0.1:8081/auth/callback`.
5. Do not add broad production wildcards. Keep the redirect allowlist limited to
   actual app, booking, and local development URLs.

In Authentication → Email Templates → Confirm signup, copy the complete subject
from `supabase/templates/confirmation.subject.txt` and the HTML from
`supabase/templates/confirmation.html`. Both are Go templates choosing exactly
one language from `auth.users.user_metadata.locale` (en/cz/sk/ru/uk). Missing or
unsupported metadata falls back to English; Czech HTML uses `lang="cs"`.
Signup now stores the language selected in the app in this metadata.
Keep `{{ .ConfirmationURL }}` intact
in both the button and fallback link. The hosted Dashboard template must be
updated separately from the local file.

Production URL and support contact are intentionally not guessed. Add a support
link to the template when the product provides an approved contact address.

## Editing and verifying the template

The source catalog is `supabase/functions/_shared/confirmationEmail.ts` and the
shared email layout is `_shared/emailLayout.ts`. Run `yarn email:generate` after
editing them; `yarn email:check` verifies the committed HTML, subject and local
config in CI. Biome formats the HTML portion during generation; the complete
Go template is excluded from the HTML parser, which cannot parse Go assignments.
Do not edit the generated files by hand.

`yarn email:preview` writes twenty fixture-only HTML/text examples to
`artifacts/emails/`. Open `index.html` to review confirmation/recovery/accepted/declined
messages in all five languages. The layout uses inline CSS and no images,
remote fonts, scripts or tracking pixels.

The Supabase CI job signs up temporary users on its fresh local stack and checks
the real Go-rendered subject, language, preheader, confirmation link and plain
text through Mailpit. It also checks missing/malformed metadata and cleans up
only its generated users/messages. No token or full email body is logged.
`scripts/email/check-auth-capture.mjs` refuses hosted URLs and requires the local
Auth URL/keys plus `AUTH_EMAIL_CAPTURE_URL` in its process environment.

The controlled hosted inbox and physical-iPhone checks remain rollout evidence
for SCH-143/SCH-146; fixture previews do not prove production delivery or mail
client compatibility.

References: [Supabase email template variables](https://supabase.com/docs/guides/auth/auth-email-templates),
[local email configuration](https://supabase.com/docs/guides/local-development/cli/config),
[Mailpit API](https://mailpit.axllent.org/docs/api-v1/).

## Manual smoke checklist

- [ ] Local Expo web signup redirects to `localhost:8081/auth/callback`, confirms
      the account, exchanges the PKCE code, and opens the authenticated app.
- [ ] A malformed, expired or reused callback never creates a session and shows
      the localized recovery message. Foreign-origin callbacks are ignored.
- [ ] iOS development build opens `schedulemasters://auth/callback` from the
      confirmation email and completes sign-in on the same device.
- [ ] Desktop mail client opens the button and the fallback URL.
- [ ] Hosted URL allowlist contains only approved exact production/local URLs.
- [ ] Repeat confirmation on a physical iPhone before TestFlight.

## Resend and password recovery (SCH-143)

The sign-in form offers **Forgot password?**. Enter an email, open the received
link in the same app/browser, set and confirm a new password, then continue.
The confirmation screen offers **Resend confirmation**. Both requests share a
60-second local cooldown persisted across screen changes and browser reloads;
Supabase Auth's server limits remain authoritative. Account-specific/rate-limit
responses use the same neutral message, including for unknown accounts. Network
outages show a retry message without exposing provider details.

Recovery uses the same exact `/auth/callback` URLs as confirmation. The SDK's
verified `PASSWORD_RECOVERY` event/PKCE redirect type selects the password form,
not a caller-controlled URL flag. A non-secret user-id marker keeps that form
active after reload; refresh events do not dismiss it. It is cleared on completion
or sign-out. Dashboard workspace requests wait until recovery is finished. Native
refresh starts/stops with app activity. The callback accepts the optional SDK
`sb_flow_id` for native compatibility; this project does not enable the SDK's
experimental addition of flow ids to redirect URLs, so existing exact allowlists
continue to work. Codes are single-use and bound to the initiating PKCE storage.
Another device/browser must request its own link. Error/callback query parameters
are removed from the browser URL after handling; they are never logged.

In hosted **Reset password** email settings, copy
`supabase/templates/recovery.subject.txt` and `supabase/templates/recovery.html`.
They use the same branded layout and five-language metadata selection as signup.
Run `yarn email:generate` / `yarn email:check` for both templates, and
`yarn email:preview` for twenty fixture examples. No external translation/AI call
is needed for these static messages.

`scripts/email/check-auth-recovery.mjs` runs only on local Auth/Mailpit and checks
all five locales with web/native callback URLs: resend, confirmation exchange,
recovery template, fresh-code rejection without the originating verifier, successful
recovery exchange, reused-code rejection, password update, token refresh, sign-out,
new-password sign-in, and neutral recovery for an unknown email. It deletes only
its own generated accounts/messages and never prints passwords, links or tokens.
CI runs it after the existing confirmation capture check.

### Hosted rollout evidence still required

Code and local tests do not configure the hosted Auth service. Before release:

- Set the approved production master-app origin and exact HTTPS callback in
  `EXPO_PUBLIC_AUTH_REDIRECT_URL`; allow that callback plus
  `schedulemasters://auth/callback` in hosted Auth. Production links must not
  contain localhost. Keep local URLs only in development projects.
- Configure the approved SMTP provider, verified sender/domain and credentials
  in hosted Supabase; keep credentials out of the repository. Copy **both**
  generated HTML/subject templates and retain `{{ .ConfirmationURL }}`.
- Send confirmation/resend/recovery only to a controlled test inbox. Verify the
  actual sender, subject, language, button and fallback URL, spam placement,
  expiry/reuse, and that no production message redirects to development URLs.
- On a physical iPhone with an installed development build, request and open the
  email, cold-start and warm-return to the password form, background/foreground,
  complete the update, sign out and sign in again. Expo Go and a simulated URL
  exchange do not prove this device flow.

Record date, environment, app revision, mailbox owner approval and pass/fail in
SCH-143/SCH-146 without storing the message body or secret callback URL. Hosted
SMTP, the controlled inbox and the physical-device check are pending until that
evidence exists; merge alone does not complete these acceptance criteria.
