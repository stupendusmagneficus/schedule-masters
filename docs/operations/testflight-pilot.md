# Internal TestFlight pilot (SCH-57)

The `pilot` EAS profile builds for App Store Connect and reads the EAS
`preview` environment. Build and upload are separate steps so the operator can
verify the target before sending an archive to Apple.

1. Link the Expo project from `apps/mobile` with `eas init`. Register the final
   iOS bundle identifier and create the matching app in App Store Connect.
   Save the project link and bundle identifier in Expo config. The bundle
   identifier does not need to match the public app name.
2. Set the pilot Supabase URL and publishable key, the deployed HTTPS booking
   URL, and `EXPO_PUBLIC_DEMO_MODE=false` in the EAS `preview` environment.
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
