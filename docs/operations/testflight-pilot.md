# Internal TestFlight pilot (SCH-57)

The `pilot` EAS profile builds for App Store Connect and reads the EAS
`preview` environment. Build and upload are separate steps so the operator can
verify the target before sending an archive to Apple.

1. Link the Expo project from `apps/mobile` with `eas init` and commit the
   generated `extra.eas.projectId` and `owner`. The iOS bundle identifier
   `cz.chvilio.app` is set in `app.json`; register it and create the matching
   app in App Store Connect. It cannot change after the first upload.
2. In the EAS `preview` environment set `EXPO_PUBLIC_SUPABASE_URL`,
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_BOOKING_WEB_URL` (the
   deployed HTTPS booking site) and `EXPO_PUBLIC_DEMO_MODE=false`. A release
   without the Supabase or booking values shows "Mobile configuration
   required"; `yarn deployment:test` checks that these values are inlined.
   Use `EXPO_PUBLIC_AUTH_REDIRECT_URL=schedulemasters://auth/callback` and allow
   the same callback in hosted Supabase Auth. Use only public values in
   `EXPO_PUBLIC_*`; these are embedded in the app.
3. From `apps/mobile`, run `eas build --platform ios --profile pilot`.
   Record the commit, EAS build ID, bundle identifier, version and build number.
   Upload that build with `eas submit --platform ios --id <build-id>`.
4. In App Store Connect, add the processed build to an internal TestFlight group.
   Install it on an iPhone and test sign-in, the email callback on a cold start,
   and opening the public booking link. Use an isolated workspace to verify
   booking confirmation and cancellation using the
   [pilot acceptance matrix](pilot-release-acceptance.md).

For account setup and build submission, use the official
[Expo iOS submission guide](https://docs.expo.dev/submit/ios/) and
[Apple's internal tester guide](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/).
