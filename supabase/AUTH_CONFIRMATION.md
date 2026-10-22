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

1. Set Site URL to the production public booking web origin once confirmed.
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

`yarn email:preview` writes fifteen fixture-only HTML/text examples to
`artifacts/emails/`. Open `index.html` to review confirmation/accepted/declined
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
- [ ] A malformed, expired, reused, or foreign-origin callback never creates a
      session and shows the localized recovery message.
- [ ] iOS development build opens `schedulemasters://auth/callback` from the
      confirmation email and completes sign-in on the same device.
- [ ] Desktop mail client opens the button and the fallback URL.
- [ ] Hosted URL allowlist contains only approved exact production/local URLs.
- [ ] Repeat confirmation on a physical iPhone before TestFlight.
