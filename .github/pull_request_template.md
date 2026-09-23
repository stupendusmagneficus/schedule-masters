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
- [ ] `yarn lint` passes.
- [ ] `yarn test` passes.
- [ ] `yarn build` passes.
- [ ] The diff was reviewed for correctness, security, and maintainability.
- [ ] Each changed file has one clear responsibility; screens, components, integrations, config, utils, types, and tests are separated appropriately.
- [ ] No app entrypoint or screen became a monolith; any intentional exception is documented below.
- [ ] Pure helpers and important new behavior have focused tests at the appropriate level.
- [ ] Manual testing was completed when the change affects user-visible behavior.

## Test plan

<!-- Commands and manual scenarios used to verify the change. -->

## Risks and follow-ups

<!-- Known limitations, migration steps, or follow-up Linear tasks. -->

## Architecture review

- Responsibility boundary review: <!-- pass / exception + explanation -->
- Test placement review: <!-- pass / exception + explanation -->
- Dependency direction review: <!-- pass / exception + explanation -->
