# Email confirmation setup

## Local Supabase

The repository config uses the Expo web callback at
`http://localhost:8081/auth/callback`, the local public booking site at
`http://localhost:3000/**`, and the native callback
`schedulemasters://auth/callback`. The confirmation email template is
`supabase/templates/confirmation.html`.

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

In Authentication → Email Templates → Confirm signup, set the subject to
`Schedule Masters — potvrďte svůj e-mail` and copy the HTML from
`supabase/templates/confirmation.html`. Keep `{{ .ConfirmationURL }}` intact
in both the button and fallback link. The hosted Dashboard template must be
updated separately from the local file.

Production URL and support contact are intentionally not guessed. Add a support
link to the template when the product provides an approved contact address.

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
