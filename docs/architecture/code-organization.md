# Code organization and responsibility boundaries

This is the repository-wide standard for keeping Schedule Masters understandable as it grows.

## Default structure

Use the smallest structure that matches the feature. Do not create folders only to satisfy a template.

```text
apps/<app>/
  App.tsx or app/                 # composition and routing only
  src/
    screens/                      # complete user-facing screens
    features/<feature>/           # feature-specific UI and behavior
    components/                   # reusable app-level components
    hooks/                        # reusable React hooks
    lib/                          # external clients and adapters
    config/                       # environment and runtime configuration
    utils/                        # pure, app-local helpers
    types.ts                      # small app-local shared contracts

packages/<package>/src/
  index.ts                        # explicit public API
  <module>.ts                     # focused implementation modules
  <module>.test.ts                # tests for pure or package-level behavior
```

## Responsibility rules

| Concern                  | Belongs in                                   | Must not own                               |
| ------------------------ | -------------------------------------------- | ------------------------------------------ |
| Routing and composition  | app entry/routes                             | business rules or data-access details      |
| Screen orchestration     | `screens/` or `features/`                    | generic primitives used by unrelated flows |
| Reusable UI              | `components/` or `ui-*` packages             | Supabase queries and navigation decisions  |
| API/Supabase integration | `lib/`, `@schedule-app/api`, adapters        | visual layout                              |
| Environment variables    | `config/`                                    | feature behavior and secrets               |
| Pure business logic      | `utils/`, domain, validation                 | React rendering and side effects           |
| Types                    | owning module/package                        | unrelated types from other features        |
| Tests                    | colocated `*.test.*` or package test folders | production runtime code                    |

## File-size and extraction rule

File length is a signal, not a target. Extract a module when a file has multiple reasons to change, mixes infrastructure with UI, contains a reusable block, or becomes difficult to test in isolation. A large file may remain temporarily only when splitting it would create artificial indirection; document that decision in the PR.

## Dependency direction

- Screens/features may use components, hooks, lib adapters, validation, and domain packages.
- Components may use design tokens and UI primitives, but not feature data fetching.
- `lib` adapters may use API packages, but API packages must not import screens or UI.
- Pure utilities and domain modules must remain framework-independent whenever practical.
- Apps must not import another app.

## PR review standard

Every PR must answer:

1. Does each changed file have one clear responsibility?
2. Were reusable pieces extracted instead of duplicated?
3. Are external calls behind an adapter or data-access boundary?
4. Are pure helpers and important user journeys tested at the right level?
5. Did the change introduce unnecessary dependencies, abstractions, or cross-layer imports?

If the answer is no, either change the implementation or document the intentional exception and follow-up task.

## Tooling standard

Prettier is the canonical formatter for the repository. Biome runs as a fast linter for JavaScript, TypeScript, and JSON; its formatter is intentionally disabled so the two tools do not rewrite files differently. ESLint remains enabled for React and React Native rules that are specific to the application layer.
