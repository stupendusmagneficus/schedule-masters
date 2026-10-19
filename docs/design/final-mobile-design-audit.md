# Final mobile product design audit

**Scope:** master app UX and UI plus the customer-facing booking web flow, based on the current React Native/Expo, Next.js, and approved design-system source.
**Date:** 2026-10-18
**Review type:** source-backed heuristic review. A simulator/device visual pass was not available in this session, so layout, motion and touch behavior still need a visual QA pass before treating this as a measured usability audit.

## Summary

The application is implemented with React Native and Expo, and it already has native affordances such as safe areas, keyboard-aware booking forms, native sharing, platform date/time pickers, and a month `FlatList`. The “mobile web” feeling is more likely to come from the visual composition than the runtime: dashboard tabs are presented as long, vertically stacked pages with repeated bordered cards, large headings and a prominent floating action on every tab. This makes the screens read like responsive pages inside a native shell.

The approved direction is coherent and should remain the foundation: neutral surfaces, restrained green actions, 16px cards, compact metadata and clear touch targets. The next step is not a wholesale redesign. Reduce repeated card framing, tighten the first-screen information hierarchy, and use platform-appropriate sheets and compact list rows where users are doing quick repeated work.

## Heuristic scorecard

Scores are source-review estimates, not usability-study scores.

| Area | Score | Finding |
| --- | ---: | --- |
| Daily task clarity | 7/10 | Today has the right information and actions, but free slots precede the day summary. |
| Navigation | 7/10 | Persistent bottom tabs and safe-area handling are clear; five labels may become cramped with larger text. |
| Information density | 6/10 | Appointment rows and calendar are useful, while repeated cards and spacious forms increase scroll length. |
| Calendar workflow | 8/10 | Day/week/month modes, slot actions and full-screen month browsing fit a scheduling product well. |
| Action hierarchy | 8/10 | Shared green/neutral/destructive variants align with the button hierarchy. |
| Feedback and recovery | 8/10 | Most data flows have loading, empty, error and retry states; review actual transitions on device. |
| Consistency | 7/10 | Shared headers, fields, buttons and modal shell exist; token adapters now distinguish interactive control borders from quiet surface borders. |
| Accessibility | 7/10 | Roles and labels are used often and targets are generally sized for touch; verify Dynamic Type/large text and VoiceOver on physical platforms. |
| Platform character | 5/10 | Several screens use the same card-and-scroll template where native lists/sheets would feel more direct. |
| Visual distinctiveness | 6/10 | The green and neutral palette is calm and consistent but the repeated outlines make the product feel like a form dashboard. |

## Findings and recommendations

### P1 — Make Today read as a daily command center — implemented

`TodayTab` now places the bookings and received-revenue summary immediately under the date header, followed by the chronological schedule with the next appointment marked first. During a cold load, the summary keeps its space with neutral placeholders so content does not jump when values arrive. Free-slot discovery is a quiet inline action in the schedule heading. When at least one booking request exists, its action appears before the schedule; with zero or an unknown count it remains after the schedule. The waiting list remains below the schedule. The persistent booking action and day navigation remain unchanged.

Evidence: `apps/mobile/src/screens/dashboard/TodayTab.tsx`; dashboard composition and floating action in `apps/mobile/src/screens/DashboardScreen.tsx`.

### P1 — Reduce the “stack of cards” effect on Customers — implemented

The customer list has compact rows, but the detail view wrapped every visit in an `InfoCard` inside a tappable row. A long history therefore became a tall stack of equally prominent boxes. The history now uses one surface with separators and compact date/service/price rows; selecting a visit still opens the existing appointment detail flow. Visit notes stay visible as subdued text and long notes can be expanded on demand. Labels are localized in all supported languages.

Evidence: `apps/mobile/src/screens/dashboard/CustomersTab.tsx`.

### P1 — Keep page framing light and persistent

The dashboard root uses one `ScrollView` and swaps tab content inside it, while the tab bar and floating booking action remain fixed. This is simple and functional, but every tab becomes a page-length scroll surface. Verify that the page title, date context and primary control remain easy to reach after scrolling. Prefer a compact sticky top region for date-dependent screens and avoid adding another large header/card tier to screens that already have a page header.

Evidence: `apps/mobile/src/screens/DashboardScreen.tsx`, `apps/mobile/src/components/DashboardPageHeader.tsx`.

### P1 — Bring mobile theme values back in line with the approved tokens — implemented

`docs/design/design-tokens.json` is the source of truth. The mobile selected-state background now uses the canonical `brand.accentSoft` value. The stronger mobile control outline is preserved and formalized as `border.control`, distinct from the lighter surface border and divider tokens, so the contrast choice is explicit rather than an undocumented override.

Evidence: `apps/mobile/src/theme/tokens.ts`, `apps/booking-web/app/globals.css`, `docs/design/design-tokens.json`, `docs/architecture/ui-conventions.md`.

### P2 — Use list and sheet patterns for frequent, shallow interactions

`FullscreenModal` provides a consistent shell for complex booking and editing flows. Keep it for multi-step tasks. For short selections or confirmation, use a platform sheet/modal with a clear dismissal gesture and safe-area support rather than another full-screen page. For long repeatable content, prefer a native-feeling list with separators and virtualization over nested scroll containers or many cards.

Evidence: shared shell at `apps/mobile/src/components/FullscreenModal.tsx`; repeated list and modal patterns in customer, waiting-list, service and booking components.

### P2 — Treat larger text and touch reach as layout states

The tab bar uses five equal-width items with 11px labels. It scales labels down to 85%, which can preserve fit but can make them small. Verify the Czech and Slovak labels at large accessibility text sizes and on narrow phones. If labels no longer fit, consider icon plus selected label, a two-row bottom bar, or a native tab pattern instead of shrinking text. Keep the existing 44pt minimum touch-target rule.

Evidence: `apps/mobile/src/components/BottomNavigation.tsx`; approved accessibility rules in `docs/design/DESIGN.md` and `docs/architecture/ui-conventions.md`.

### P2 — Keep the customer booking flow’s compact mobile layout

The booking page already has a responsive 720px content limit, a narrow-screen layout, visible focus styles, 44px controls and reduced-motion support. Preserve this focused linear flow. During visual QA, verify the multi-service summary, long localized labels, date/time selection and error/success states at 320–375px and with browser zoom; avoid importing the master dashboard’s card-heavy navigation into this customer flow.

Evidence: `apps/booking-web/app/globals.css`, `apps/booking-web/src/components/PublicServicePicker.tsx`, `apps/booking-web/app/page.tsx`.

### P2 — Protect the calendar’s high-density advantage

The calendar is the most product-specific screen and already offers more useful spatial context than a generic list. Preserve the timeline and month workload indicators. During visual QA, check the day/week slot hit area, contrast between manual/online appointments and breaks, long service names, and the transition between the month sheet and the selected day. These are the places where dense scheduling interfaces most often feel either cluttered or imprecise.

Evidence: `apps/mobile/src/screens/dashboard/CalendarTab.tsx`, `DayTimeline.tsx`, `WeekCalendar.tsx`, `MonthCalendar.tsx`, `CalendarMonthPickerSheet.tsx`.

### P3 — Add small native cues only where they reinforce action feedback

Use restrained platform feedback for successful creation, cancellation, selection and payment entry where it helps confidence. Do not add haptics or motion to passive metric changes. Preserve reduced-motion behavior and do not delay the next action for an animation.

Evidence: motion and feedback requirements in `docs/design/DESIGN.md`; shared feedback state in `apps/mobile/src/screens/DashboardScreen.tsx`.

## What is already working

- The persistent bottom navigation, safe areas and green floating booking action make the app’s primary workflow reachable.
- The calendar is designed around actual scheduling work, including time slots, blocks, workload and multi-month browsing.
- The button system has clear positive, secondary and destructive semantics.
- The Finance first view now has three clear numbers: received revenue, expected revenue and completed visits. Expanded detail stays behind a user action, and the UI avoids calling revenue “profit.”
- The visit-note design keeps the data attached to a visit, visible in appointment details and customer history, without adding allergy or medical fields.
- Recurring bookings create independently managed appointments and ask for an explicit confirmation before cancelling future occurrences.

## Recommended next design work

1. Run a real device/simulator pass at narrow and wide supported phone sizes, including Czech/Slovak long labels and large accessibility text.
2. ~~Simplify Today’s top-of-screen order and verify that the next appointment is visible without scrolling on a typical phone.~~ **Implemented:** summary first, then schedule; device visibility still needs visual QA.
3. ~~Convert customer history from separate cards to compact separated rows.~~ **Implemented:** one history surface, compact rows, and expandable localized notes.
4. Review modal use screen by screen: keep full-screen for multi-step work, and use native sheets for quick selections and confirmations where the shared component system allows it.
5. Capture screenshots for Today, Calendar day/week/month, Customers list/detail, Finance, Profile and public booking; record any clipping, overlap, keyboard occlusion or scroll jumps before making shared-system changes.

## Visual verification limits

No application tab or device simulator was open for this review. The scorecard and recommendations above are based on source inspection and the approved design rules, not pixel measurements or hands-on gesture testing. This is a final source audit and a focused visual QA checklist, not a claim that the UI has passed device QA.

## Follow-up source audit — 2026-10-19

I rechecked the dashboard screens, the main calendar interaction components, the booking/editing surfaces, the customer-facing booking flow, shared navigation and modal primitives against the approved design rules. This pass updates the priority list with source-backed findings. No code changes or automated tests were part of this audit.

### P1 — Enlarge Week calendar time-slot hit areas — implemented in SCH-137

Each empty time slot in the Week view was a `Pressable` with a height of 24 pt. Selecting a time is a core path to create a booking or personal break, but that target was substantially smaller than the app's 44 pt minimum. The fix preserves the visual density while grouping two rows into one larger target; neighboring hour groups remain separate.

The week grid now keeps its 24 pt visual half-hour rows but combines each adjacent pair into one 48 pt press target. Tapping anywhere in that hour opens the existing quarter-hour picker, where the user chooses the exact time. A final unmatched half-hour gets a 44 pt target. Added unit coverage for grouping and an E2E case for target size and quarter-hour selection. The selected radio option now exposes `aria-checked` on web.

Evidence: `apps/mobile/src/screens/dashboard/WeekCalendar.tsx`, `apps/mobile/src/screens/dashboard/weekCalendarTouchTarget.ts`, and `tests/e2e/mobile-web.spec.ts`. The targeted Playwright E2E passed at a 375 px viewport; mobile unit tests, typecheck, lint, Biome checks, and Expo web export also passed.

### P2 — Bring Month calendar day targets up to the shared minimum

The month view's day buttons are 42 × 42 pt. This is close to the target but still below the documented 44 pt minimum. Increase the interactive area without changing the visual day marker or making neighboring dates ambiguous.

Evidence: `apps/mobile/src/screens/dashboard/MonthCalendar.tsx:271-289` and `:471-487`.

### P2 — Validate the bottom navigation with long labels and larger text

The bottom bar gives five tabs equal width and uses 11 pt labels, which can shrink to 85% to fit. This preserves the layout but can reduce legibility for Czech/Slovak labels and users with larger text preferences. Check all five supported locales at the narrowest supported device width and with the largest practical system text size. If labels become hard to read, prefer a navigation layout adjustment over shrinking the text further.

Evidence: `apps/mobile/src/components/BottomNavigation.tsx:99-116` and `:142-154`; locale and accessibility requirements in `docs/design/DESIGN.md`.

### Confirmed strengths in this pass

- The customer directory is searchable and compact; phone and SMS actions have explicit accessible labels, while details and history are opened on demand (`apps/mobile/src/screens/dashboard/CustomersTab.tsx`).
- The Finance overview presents received income, expected income, and completed bookings first; secondary metrics and weekly detail are behind an explicit expansion (`apps/mobile/src/screens/dashboard/FinancesTab.tsx`).
- The public booking form uses associated labels, required email, a notification explanation, live date context, and announced errors (`apps/booking-web/app/page.tsx`). Service selection and appointment management also have semantic button/alert patterns.
- Shared modal shells provide named close actions, safe-area handling, and consistent headers. Complex booking forms are keyboard-aware and scrollable (`apps/mobile/src/components/BottomSheet.tsx`, `FullscreenModal.tsx`, and `ManualBookingModal.tsx`).
- Today, Calendar, Customers, Finance, and Profile use a consistent page header and shared action styles. Calendar state and appointment status are exposed with accessible labels, not color alone.

### Audit coverage and limits

Source inspection covered the master app's auth/setup and dashboard areas, shared navigation/actions/modal shells, booking and appointment flows, and the public booking and appointment-management pages. The earlier findings above remain applicable, including reducing repeated card framing and validating larger text. There was no simulator/device session for this pass, so I did not verify actual tap accuracy, scrolling, keyboard occlusion, contrast by rendered pixels, animation, or layout at multiple device sizes. Those are the remaining visual QA checks; the findings above are code-level evidence, not a claim of device usability testing.
