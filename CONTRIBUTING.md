# Contributing

## Workflow

Use GitHub Flow: create a short-lived feature branch from `main`, implement the linked Linear task, run the quality gates, and open a pull request. Do not commit directly to `main`.

Use Conventional Commits, for example `feat(auth): add passwordless sign in` or `chore: update tooling`.

## Dependencies

Use Yarn only. Add dependencies to the workspace that owns them. Shared dependencies belong at the root only when they are tooling used across the repository. Use `workspace:*` for internal package dependencies and avoid deep imports.

## Quality gates

Before opening a pull request, run:

~~~bash
yarn install --immutable
yarn typecheck
yarn lint
yarn test
yarn build
~~~

The current scaffold intentionally has no product database schema, authentication, booking logic, notification provider, payment integration, or final UI library.

## Scope control

New product behavior must be linked to a Linear task and classified as P0, P1, Later, or Rejected. The current scaffold must remain free of booking business logic.
