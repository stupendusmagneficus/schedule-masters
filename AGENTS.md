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

## Task delivery workflow

Apply this workflow to every task, scaling checks to the scope and risk:

1. Read the task/acceptance criteria and inspect the current repository state before editing. Select and read only the relevant installed skills; use skill discovery when an important capability is missing, and do not install unrelated skills just to maximize the count.
2. Implement against the existing architecture and shared contracts. For behavior changes, write or update behavior-focused tests first, observe the failure, then implement and refactor without changing the expected behavior.
3. Before handoff, run the applicable format, lint, typecheck, unit/integration, build, and critical-flow E2E checks. Inspect UI changes at relevant viewport sizes when feasible; report any visual verification that could not be performed.
4. Simplify the resulting diff where that preserves clarity, then conduct a separate final review of the exact diff for correctness, edge cases, security/data access, architecture, test coverage, accessibility, and unnecessary complexity. Fix material findings and rerun affected checks.
5. Open or update a PR only after these checks and review. Summarize test evidence, visual evidence/limitations, and review findings in the PR description. Never claim a check or review was completed without evidence.

Use Biome as the canonical formatter and linter for JavaScript, TypeScript, JSX, TSX, JSON, CSS, HTML, and GraphQL. Run `yarn format` locally and `yarn format:check` in CI. Do not add another formatter without an explicit architecture decision.

The detailed conventions are in [Code organization and responsibility boundaries](docs/architecture/code-organization.md).

## Product design system

- Before changing a user-facing screen or shared UI, read [the approved visual direction](docs/design/DESIGN.md), [design tokens](docs/design/design-tokens.json), and [UI conventions](docs/architecture/ui-conventions.md).
- Treat those documents and `apps/mobile/src/theme/` as the product design system. Reuse shared components such as `DashboardPageHeader` and `FullscreenModal`; do not introduce screen-specific visual patterns for elements that already have a shared component.
- Keep colors, spacing, type, radii, control sizes, iconography, modal navigation, feedback, and motion consistent with the approved rules. If a product need requires a change, update the shared rule/token and affected shared components as part of the same change.
- Review mobile UI changes at narrow and wide supported viewports when feasible. Record visual evidence or the reason visual review was unavailable in the PR.

## Architecture diagrams

Use the project-local [Archify skill](.agents/skills/archify/SKILL.md) when a change needs an architecture, workflow, sequence, data-flow, or lifecycle diagram.

- Keep authored Archify JSON sources under `docs/architecture/diagrams/`.
- Validate every source with Archify before sharing or committing its rendered HTML.
- Treat generated HTML as documentation only; never import Archify into a production app or runtime package.
- Base repository diagrams on current source evidence and record the commit revision when source-backed links are required.
- Do not claim browser or visual verification unless `visual-check` was actually run and the artifact was inspected.
