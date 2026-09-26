## Summary

<!-- What changed and why? Link the Linear task. -->

Linear task: SCH-

## Review checklist

- [ ] The change is within the linked task scope and acceptance criteria.
- [ ] Product or architecture decisions are documented when needed.
- [ ] Dependencies are added only to the workspace that owns them.
- [ ] No secrets or production credentials are committed.
- [ ] `yarn typecheck` passes.
- [ ] `yarn format:check` passes.
- [ ] `yarn biome:lint` passes.
- [ ] `yarn lint` passes.
- [ ] `yarn test` passes.
- [ ] `yarn build` passes.
- [ ] The diff was reviewed for correctness, security, and maintainability.
- [ ] Each changed file has one clear responsibility; screens, components, integrations, config, utils, types, and tests are separated appropriately.
- [ ] No app entrypoint or screen became a monolith; any intentional exception is documented below.
- [ ] Pure helpers and important new behavior have focused tests at the appropriate level.
- [ ] Manual testing was completed when the change affects user-visible behavior.

## Design review (required for UI/UX changes)

<!-- Complete every item when the PR changes screens, components, styles, tokens, copy, or interaction flows. -->

- [ ] I completed the design review checklist in `docs/design/design-review.md`.
- [ ] I checked spacing, typography, layout, and responsive behavior at the affected viewport sizes.
- [ ] I checked accessibility, touch targets, focus/keyboard behavior, loading, error, empty, and disabled states.
- [ ] I attached visual evidence or explained why visual evidence is not applicable.

Visual evidence: <!-- screenshots, recording, local route, or N/A with explanation -->

## Test plan

<!-- Commands and manual scenarios used to verify the change. -->

## Architecture report

- [ ] Archify report comment was reviewed when architecture diagram sources changed.
- [ ] Architecture diagram changes are intentional and match the implementation.
- [ ] Visual report findings are documented in the PR when follow-up work is needed.

## Risks and follow-ups

<!-- Known limitations, migration steps, or follow-up Linear tasks. -->

## Architecture review

- Responsibility boundary review: <!-- pass / exception + explanation -->
- Test placement review: <!-- pass / exception + explanation -->
- Dependency direction review: <!-- pass / exception + explanation -->
