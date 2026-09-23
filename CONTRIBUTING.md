# Contributing

## Workflow

Use GitHub Flow: create a short-lived feature branch from `main`, implement the linked Linear task, run the quality gates, and open a pull request. Do not commit directly to `main`.

Use Conventional Commits, for example `feat(auth): add passwordless sign in` or `chore: update tooling`.

## Dependencies

Use Yarn only. Add dependencies to the workspace that owns them. Shared dependencies belong at the root only when they are tooling used across the repository. Use `workspace:*` for internal package dependencies and avoid deep imports.

## Code organization

All applications and packages follow the repository-wide [code organization standard](docs/architecture/code-organization.md). Keep entrypoints thin, separate screens/features from reusable components, isolate integrations in `lib` or adapter modules, keep pure helpers in `utils`, and place meaningful tests next to the logic they cover. Do not merge a new monolithic screen or a file that mixes UI, data access, navigation, and business rules without documenting the exception in the PR.

## Quality gates

Before opening a pull request, run:

```bash
yarn install --immutable
yarn typecheck
yarn format:check
yarn lint
yarn test
yarn build
```

## Pull request review protocol

Every pull request must receive a code review before merge. The review checks the
task scope and acceptance criteria, correctness, security, maintainability, tests,
and unintended product or architecture changes.

The repository runs two GitHub Actions workflows for pull requests:

- `CI` runs typecheck, lint, tests, and the build.
- `PR Review Hygiene` checks diff whitespace, the Yarn lockfile policy, and high-risk secret patterns.

The AI agent should perform a structured review before opening or updating a pull
request and record the result in the pull request. CI provides deterministic gates;
it does not automatically approve or merge code. A human review remains required
before production-impacting changes are merged.

The structured review must include responsibility boundaries, file structure,
dependency direction, test placement, and unnecessary abstraction or file growth.

The current scaffold intentionally has no product database schema, authentication, booking logic, notification provider, payment integration, or final UI library.

## Scope control

New product behavior must be linked to a Linear task and classified as P0, P1, Later, or Rejected. The current scaffold must remain free of booking business logic.
