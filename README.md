# Schedule Masters

Schedule Masters is a Czech-first scheduling product for independent service professionals. The first MVP targets nail technicians and provides an iOS master app, a public booking web page, and a personal booking link.

The final brand name is not selected yet, so the repository uses neutral technical names.

## Repository structure

~~~text
apps/
  mobile/                  # Expo + React Native master app
  booking-web/             # Next.js public booking web

packages/
  domain/                  # pure business contracts
  validation/              # Zod validation boundary
  i18n/                    # RU/CZ/EN locale foundation
  api/                     # typed data-access boundary
  types/                   # shared technical types
  config/                  # shared tooling configuration

supabase/                  # PostgreSQL migrations, seed data, and local CLI config
docs/                      # repository documentation
~~~

## Prerequisites

- Node.js 22.14.0 (see .nvmrc)
- Corepack enabled
- Yarn 4
- Xcode for iOS development
- Expo Go or an iOS simulator

Enable the package manager and install dependencies:

~~~bash
corepack enable
yarn install
~~~

## Development commands

~~~bash
# Run all persistent development tasks
yarn dev

# Run the mobile app only
yarn workspace @schedule-app/mobile dev

# Run the booking web only
yarn workspace @schedule-app/booking-web dev

# Run quality checks
yarn typecheck
yarn lint
yarn test
yarn build
~~~

The mobile app starts with Expo. The booking web starts at http://localhost:3000.

### Supabase

The repository uses Supabase/PostgreSQL for the application backend. Run the local stack with Docker before working on database changes:

```bash
yarn supabase:start
yarn supabase:reset
yarn supabase:types
```

See [`docs/development/supabase.md`](docs/development/supabase.md) for environment boundaries, migration rules, and hosted project access.

## Documentation

- [Monorepo architecture](docs/architecture/monorepo.md)
- [Technical scaffold design](docs/superpowers/specs/2026-09-19-technical-scaffold-design.md)
- [Technical scaffold implementation plan](docs/superpowers/plans/2026-09-19-technical-scaffold-plan.md)
- [Linear decision hub](https://linear.app/schedule-app-master/document/schedule-masters-centr-finalnyh-reshenij-8ea0c720e4f2)

Product decisions remain in Linear. GitHub contains the implementation documentation and the versioned technical record.

## Current scope

This repository contains the technical scaffold and the initial Supabase schema foundation. Authentication flows, public booking functions, booking availability, notifications, Stripe, production deployment, and the final UI library are implemented in later tasks.

## Contributing

Read CONTRIBUTING.md before creating a branch or adding a dependency.
