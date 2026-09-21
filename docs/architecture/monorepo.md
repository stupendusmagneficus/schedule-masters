# Monorepo Architecture

## Applications

- `apps/mobile`: Expo and React Native master application, iOS-first.
- `apps/booking-web`: Next.js public booking page and future personal booking links.

Applications own routing, platform adapters, and presentation. They must not import each other.

## Packages

- `@schedule-app/domain`: pure domain contracts and status values.
- `@schedule-app/validation`: Zod schemas at input boundaries.
- `@schedule-app/i18n`: RU/CZ/EN locale foundation.
- `@schedule-app/api`: typed data-access boundary; no credentials or implementation yet.
- `@schedule-app/types`: shared technical type placeholders.
- `@schedule-app/config`: shared TypeScript, lint, formatting, and test configuration.

## Dependency direction

Apps may depend on packages. Domain must stay at the bottom of the dependency graph. Packages must expose explicit public entrypoints and use workspace protocol dependencies. Supabase integration will be added behind the API boundary in a later task.

## Tooling

Yarn 4 with `nodeLinker: node-modules` manages dependencies. Turborepo orchestrates development and quality tasks. GitHub Actions runs the same install, typecheck, lint, test, and build gates used locally.

## Source of truth

Product and final decision records live in the Linear decision hub: https://linear.app/schedule-app-master/document/schedule-masters-centr-finalnyh-reshenij-8ea0c720e4f2. This file records the implementation boundaries needed by contributors and CI.
