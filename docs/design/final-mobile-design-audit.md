# Final mobile product design audit

**Scope:** master app UX and UI, based on the current React Native/Expo screen and component source and the approved design system.
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
| Consistency | 7/10 | Shared headers, fields, buttons and modal shell exist, but the high-level page composition still varies. |
| Accessibility | 7/10 | Roles and labels are used often and targets are generally sized for touch; verify Dynamic Type/large text and VoiceOver on physical platforms. |
| Platform character | 5/10 | Several screens use the same card-and-scroll template where native lists/sheets would feel more direct. |
| Visual distinctiveness | 6/10 | The green and neutral palette is calm and consistent but the repeated outlines make the product feel like a form dashboard. |

## Findings and recommendations

### P1 — Make Today read as a daily command center

`TodayTab` currently places the “Free slots” action before the bookings and received-revenue summary. The approved screen specification puts the compact daily summary and next appointment first, with secondary discovery actions after them. Keep “New booking” as the persistent primary action, show the day’s booking/revenue summary immediately under the title, then the next appointment and chronological schedule. Place free slots and waiting/request queues after the core day context, ordered by operational urgency.

Evidence: `apps/mobile/src/screens/dashboard/TodayTab.tsx`; dashboard composition and floating action in `apps/mobile/src/screens/DashboardScreen.tsx`.

### P1 — Reduce the “stack of cards” effect on Customers

The customer list has compact rows, but the detail view wraps every visit in an `InfoCard` inside a tappable row. A long history therefore becomes a tall stack of equally prominent boxes. Use one history surface with separators and compact date/service/price rows; keep the selected visit detail in the existing appointment detail flow. Keep visit notes visible in the history as a short, subdued second line and expand long notes on demand.

Evidence: `apps/mobile/src/screens/dashboard/CustomersTab.tsx`.

### P1 — Keep page framing light and persistent

The dashboard root uses one `ScrollView` and swaps tab content inside it, while the tab bar and floating booking action remain fixed. This is simple and functional, but every tab becomes a page-length scroll surface. Verify that the page title, date context and primary control remain easy to reach after scrolling. Prefer a compact sticky top region for date-dependent screens and avoid adding another large header/card tier to screens that already have a page header.

Evidence: `apps/mobile/src/screens/DashboardScreen.tsx`, `apps/mobile/src/components/DashboardPageHeader.tsx`.

### P2 — Use list and sheet patterns for frequent, shallow interactions

`FullscreenModal` provides a consistent shell for complex booking and editing flows. Keep it for multi-step tasks. For short selections or confirmation, use a platform sheet/modal with a clear dismissal gesture and safe-area support rather than another full-screen page. For long repeatable content, prefer a native-feeling list with separators and virtualization over nested scroll containers or many cards.

Evidence: shared shell at `apps/mobile/src/components/FullscreenModal.tsx`; repeated list and modal patterns in customer, waiting-list, service and booking components.

### P2 — Treat larger text and touch reach as layout states

The tab bar uses five equal-width items with 11px labels. It scales labels down to 85%, which can preserve fit but can make them small. Verify the Czech and Slovak labels at large accessibility text sizes and on narrow phones. If labels no longer fit, consider icon plus selected label, a two-row bottom bar, or a native tab pattern instead of shrinking text. Keep the existing 44pt minimum touch-target rule.

Evidence: `apps/mobile/src/components/BottomNavigation.tsx`; approved accessibility rules in `docs/design/DESIGN.md` and `docs/architecture/ui-conventions.md`.

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
2. Simplify Today’s top-of-screen order and verify that the next appointment is visible without scrolling on a typical phone.
3. Convert customer history from separate cards to compact separated rows.
4. Review modal use screen by screen: keep full-screen for multi-step work, and use native sheets for quick selections and confirmations where the shared component system allows it.
5. Capture screenshots for Today, Calendar day/week/month, Customers list/detail, Finance and Profile; record any clipping, overlap, keyboard occlusion or scroll jumps before making shared-system changes.

## Visual verification limits

No application tab or device simulator was open for this review. The scorecard and recommendations above are based on source inspection and the approved design rules, not pixel measurements or hands-on gesture testing. This is a final source audit and a focused visual QA checklist, not a claim that the UI has passed device QA.
