# Repository engineering rules

These rules apply to every application and package in this repository.

## Keep responsibilities separate

- Keep route and app entry files thin. They compose screens and providers; they do not contain feature implementations.
- Put user-facing flows in `screens/` or feature folders.
- Put reusable visual pieces in `components/` and platform primitives in the relevant UI package.
- Put external integrations in `lib/` or an explicit adapter module.
- Put environment parsing in `config/`.
- Put pure reusable logic in `utils/` or domain packages.
- Put shared types in a dedicated `types.ts` or the package that owns the type; do not create a global dumping-ground file.
- Do not mix API calls, navigation, form state, business rules, and large style definitions in one file.

## Files and tests

- Each file should have one clear responsibility and the smallest public surface possible.
- Prefer composition over large conditional components.
- Keep pure helpers deterministic and add a colocated `*.test.ts` file for their meaningful behavior.
- Add integration tests for data-access boundaries and end-to-end tests for critical user journeys.
- Do not create empty abstraction folders or wrappers without a current consumer.

## Pull requests

Before opening or updating a PR, review the change for responsibility boundaries, dependency direction, test placement, security, and unnecessary file growth. Record the result in the PR description and complete the repository PR checklist.

Use Prettier as the canonical formatter and Biome as the fast JavaScript/TypeScript/JSON linter. Do not run Biome formatting in this repository because it would create a second formatting source of truth.

The detailed conventions are in [Code organization and responsibility boundaries](docs/architecture/code-organization.md).
