# Design review gate

Design review is required for every pull request that changes a user-facing
screen, component, style, design token, copy, or interaction flow. This gate
turns the visual direction in `DESIGN.md` into a repeatable review instead of
relying on a final spot check.

## Review checklist

Before marking the PR ready for review:

1. Identify every affected screen and the platforms where it is rendered
   (native mobile, mobile web, or booking web).
2. Check the spacing rhythm and alignment: screen edges, section spacing, field
   labels, input padding, button height, grid columns, and bottom safe-area
   behavior.
3. Check typography hierarchy, text wrapping, localization length, contrast,
   and whether labels and errors remain readable at the smallest supported
   viewport.
4. Check all relevant interaction states: default, pressed, selected, loading,
   disabled, validation error, server error, empty, and success.
5. Check accessibility: labels, roles, focus/keyboard behavior, touch targets,
   dynamic content announcements, and native picker behavior where applicable.
6. Check responsive behavior at a narrow phone width (320–375 px), a standard
   phone width (390–430 px), and the browser layout used for QA.
7. Attach screenshots or a short recording for visual changes. Include the
   route/screen and viewport in the description. If visual evidence cannot be
   produced, explain the reason in the PR body.

## Evidence standard

For a UI change, the PR body must include the checked design-review items and a
non-empty `Visual evidence:` line. Evidence can be screenshots, a recording, a
local route used for verification, or an explicit explanation for why the
change has no visible output.

The automated gate checks the PR body and only activates when the diff contains
likely user-facing UI files. It does not replace human review: the reviewer
should compare the evidence against the affected screen and the design tokens.
For screens covered by mobile-web E2E, geometry assertions are also part of the
CI gate. A passing checklist alone is not evidence that two controls cannot
overlap; the affected screen needs a regression assertion or a documented
reason why automation is not practical.

## Local check

Run the same check locally after completing the PR body:

```text
corepack yarn design-review:check
```

On GitHub, the `CI / Design review` check must be selected as a required status
check in branch protection rules for `main`.
