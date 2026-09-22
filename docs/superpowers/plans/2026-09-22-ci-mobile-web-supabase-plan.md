# SCH-47 CI for Mobile, Web, and Supabase

## Goal

Make every pull request validate the current MVP monorepo without requiring hosted credentials: install the locked dependency graph, validate source quality, build the Expo mobile package and Next.js booking web package, and prove that Supabase migrations, seed data, and generated database types remain reproducible.

## Scope

- Keep GitHub Actions as the CI runner and use the repository's Yarn/Corepack setup.
- Keep the quality pipeline framework-agnostic at the root while making mobile and booking-web builds explicit through Turborepo package tasks.
- Validate iOS-facing Expo code through TypeScript, lint, tests, and the existing Expo web export; native IPA builds are deferred to the EAS/App Store delivery task.
- Validate Supabase entirely against the local Docker stack; CI must not need hosted Supabase keys or modify the hosted project.
- Add safe workflow defaults: read-only repository permissions, stale-run cancellation, and bounded job duration.

## Implementation steps

1. Review existing workflow, package scripts, Turbo task graph, and Supabase commands.
2. Update the workflow so quality and database jobs are deterministic, explicit, and safe for pull requests.
3. Document the required checks and the boundary between pull-request CI and future EAS/App Store builds.
4. Run the same checks locally, including migration reset, local database lint, and generated-type drift detection.
5. Review the diff for correctness, security, and maintainability before opening the PR.

## Acceptance criteria

- Pull requests run dependency installation with the committed Yarn lockfile.
- Pull requests run lint, typecheck, unit tests, and builds for the monorepo, including `@schedule-app/mobile` and `@schedule-app/booking-web`.
- Pull requests start a local Supabase stack, apply migrations and seed data, lint the local database, regenerate TypeScript types, and fail on generated-type drift.
- No hosted Supabase secret is required by CI.
- Workflow permissions are read-only and stale runs for the same ref are cancelled.
- CI failures identify the failed responsibility clearly through job and step names.
- The repository documents that native iOS artifact creation is a later EAS/App Store concern, not silently omitted from the MVP quality gate.
