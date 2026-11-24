# Chvilio

Read `AGENTS.md` before working in this repository. Nested instructions also apply.

Chvilio is an iOS-first scheduling product for independent service professionals
in Czechia, with a public Next.js booking page and a Supabase backend. Technical
repository/package names still use `schedule-masters` and `@schedule-app/*`.

## Independent product audit

The owner requested an independent, multi-agent assessment of readiness for
manual testing, TestFlight and a live launch. The complete handoff starts at
`docs/audit/claude-handoff/README.md`. The ready-to-paste first prompt is
`docs/audit/claude-handoff/FIRST-PROMPT.md`.

Read the product brief and source map before assessing features. Record your own
baseline commit and check results. Treat historical CI, issue statuses and the
handoff's implementation claims as dated inputs to verify.

The handoff includes a JSON knowledge base, a queryable SQLite copy, all reachable
main commit subjects and changed paths at the snapshot, PR metadata, sanitized
Linear task excerpts, business decisions, evidence boundaries and audit cases.
It contains no provider keys, database dumps or customer exports.

## Working conventions

- Node version is in `.nvmrc`; use the root Yarn version from `package.json`.
- `yarn format:check`, `yarn biome:lint`, `yarn typecheck`, `yarn lint`,
  `yarn test` and `yarn build` are repository checks.
- Database integration and real-backend browser tests need disposable local
  Supabase. Follow `docs/audit/claude-handoff/VERIFICATION.md` and the CI workflow.
- Test files are colocated `*.test.ts` and browser journeys live in `tests/e2e/`.
- Apps own screens and platform adapters. Shared packages own domain,
  validation, localization, typed API and analytics contracts.
- Follow the existing design system before changing any visible UI.
- Read installed Next.js documentation before editing booking-web.
- Audit artifacts belong under `artifacts/independent-audit/`; preserve the
  working tree and label any local experimental patches.
