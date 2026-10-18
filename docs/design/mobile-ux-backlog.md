# Mobile UX backlog

## Design principle

Schedule Masters is a daily work tool for independent masters. Optimize for quick scanning and frequent actions: keep the primary path obvious, remove choices that do not change the outcome, and reveal detail only when it is useful. Reuse the approved tokens and shared components. Add a new screen or control only when it saves effort or prevents a meaningful mistake.

## Prioritized tasks

### P0 — Make core actions work reliably

- **Share free time in one step** — publish a text schedule for today and the next 13 days; do not ask the master to select a service, date range, or format. Explain in the shared message that a start time depends on the service the client chooses.
- **Make calendar time taps actionable** — tapping an empty time in Day or Week opens quarter-hour choices, then offers booking or a personal break. Keep the calendar touchable while availability refreshes.

### P1 — Improve day-to-day scanning

- **Keep customer lists compact** — show the identifiers needed to find a person in a short row; open history, contact actions, and destructive actions only on demand.
- **Prioritize the next useful action on Today** — keep the next appointment and pending decisions easy to find; defer low-frequency information below them.
- **Stabilize loading layouts** — use in-place progress indicators or placeholders that preserve content dimensions and do not block unrelated controls.

### P2 — Reduce visual weight where it slows repeated use

- **Review card density screen by screen** — remove nested containers and repeated outlines when spacing and typography already distinguish sections; keep the existing palette and radii.
- **Normalize action hierarchy** — one clear primary action per context, secondary actions quieter, destructive actions visibly red and separated from routine actions.
- **Check long content and small screens** — verify labels, forms, and lists with narrow widths and larger text before adjusting component sizes.

### P3 — Final mobile quality pass

- **Audit reachable controls and focus order** — confirm touch targets, screen-reader names, keyboard behavior, and modal close/cancel consistency.
- **Review motion and transitions** — keep only motion that explains navigation or saves orientation; avoid transitions that shift the calendar or list unexpectedly.
- **Run a focused visual pass on supported phone sizes** — fix observed usability issues using shared components and tokens; avoid introducing a parallel design system.

## Delivery order

Implement P0 first, then take P1 items only when supported by a concrete user workflow or observed friction. P2 and P3 are review tasks, not blanket redesigns: record a specific screen and problem before changing it.
