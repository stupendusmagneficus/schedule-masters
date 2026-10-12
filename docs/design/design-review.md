# Design review checklist

Use this checklist during review of pull requests that change a user-facing
screen, component, style, design token, copy, or interaction flow. It helps
turn the visual direction in `DESIGN.md` into a repeatable review instead of
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

For a UI change, include the checked design-review items and a `Visual
evidence:` line in the PR body when practical. Evidence can be screenshots, a
recording, a local route used for verification, or an explanation for why the
change has no visible output.

The checklist is a review aid, not an automated CI gate. Reviewers should
compare visual evidence against the affected screen and design tokens. A
checklist alone does not prove that controls cannot overlap; add a regression
assertion when layout behavior can be tested reliably.
