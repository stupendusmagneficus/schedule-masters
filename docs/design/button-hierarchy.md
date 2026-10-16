# Button hierarchy and project audit

## Product rules

Button color and placement should tell the master what happens next, what is
less common, and what may undo work. Use the semantic tokens in
`design-tokens.json`; do not add screen-local button colors.

| Variant | Treatment | Use for | Examples |
| --- | --- | --- | --- |
| Primary | Filled `brand.action`, white label, darker pressed state | The single main positive action in a flow | New booking, save payment, save form, confirm request |
| Secondary | White or subtle surface, green border and green label | A useful but less frequent alternative | Move request to waiting list, free slots, open booking link |
| Destructive / exit | White surface, red border and red label | Cancel, decline, remove, delete, or sign out; add a confirmation for consequential data changes | Decline request, cancel appointment, remove a waiting-list entry, sign out |
| Neutral / quiet | Neutral surface or text-only; no success/danger color | Dismiss, go back, filters, navigation, alternate views | Cancel edit, close modal, calendar arrows |
| Selection | Neutral outline; selected state uses soft green surface and green border | Choosing a value rather than submitting a workflow | Service, date, time, locale, segment |
| Icon-only | Quiet control, at least 44×44pt on native, explicit accessible label | Compact navigation or per-item utilities | Close, edit, delete, previous/next |

Only the primary action should be filled green in a local action group. An
equally important destructive decision may sit beside it at the same width,
using the destructive variant. Less frequent actions go below or into a menu
and must not compete with the primary pair. Filled red is reserved for a
confirmed, irreversible action. Sign out uses the red outline for emphasis,
but needs no destructive confirmation because it does not delete business
data.

## Button inventory

This audit treats high-level business actions separately from low-level
selection controls. `Pressable` controls used for calendar dates, time slots,
service options, and navigation are not submit buttons; they follow the
selection, navigation, and icon-only variants above.

| Area | Main actions | Current owner(s) |
| --- | --- | --- |
| Dashboard | New booking, free slots, requests, waiting list | `FloatingBookingAction`, `TodayTab`, `BookingRequestsModal`, `WaitingListModal` |
| Appointment lifecycle | Save payment, complete, no-show, cancel, contact | `AppointmentDetailsModal` |
| Booking flow | Continue, create booking, save/edit service, choose service/time | `ManualBookingModal`, `ServicePickerField`, `ServiceEditorModal`, booking web page |
| Customer management | Create customer, edit, contact, segment/filter | `CustomersTab`, customer components |
| Workspace and profile | Save workspace, open settings, sign out, locale | `WorkspaceSettingsModal`, `ProfileTab`, `LocalePicker` |
| Waiting-list CRUD | Add existing/new client, save, remove one/all, close/cancel | `WaitingListModal` |
| Calendar | Add booking/break, date/view navigation, select time block | `CalendarTab`, `MonthCalendar`, `WeekCalendar`, `DayTimeline` |
| Public booking and self-service | Select service/slot, submit booking, confirm/cancel a booking | `apps/booking-web/app/page.tsx`, `CustomerAppointmentPage.tsx` |
| Setup and authentication | Continue setup, sign in/up, resend email, return to app | `SetupScreen`, setup steps, `AuthForm`, `EmailConfirmationScreen` |

All app-owned React Native controls are currently hand-built `Pressable`
elements; there is no universal button component. This makes semantic
consistency and targeted migrations the main risks. The web app has
`.primary-button` and `.secondary-button` CSS classes, but its `--action`
variable was graphite even though the approved design token is green.

## Prioritized implementation plan

| Priority | Scope | Decision / outcome |
| --- | --- | --- |
| P1 — current | [SCH-103](https://linear.app/schedule-app-master/issue/SCH-103/zadat-edinuyu-ierarhiyu-knopok-i-privesti-klyuchevye-cta): core action colors and booking-request decisions | Align web primary token with green; make accept and decline equal peers (green filled / red outlined); make waiting-list move a green outlined secondary. |
| P1 | [SCH-104](https://linear.app/schedule-app-master/issue/SCH-104/unificirovat-knopki-zhiznennogo-cikla-zapisi): appointment lifecycle | Standardize payment save, completion, no-show, cancel and confirmation actions; keep cancellation clearly destructive and preserve successful-save feedback. |
| P1 | [SCH-105](https://linear.app/schedule-app-master/issue/SCH-105/unificirovat-knopki-sozdaniya-i-redaktirovaniya-dannyh): booking and CRUD forms | Standardize create/save/edit/cancel actions across manual booking, service catalog, customers, workspace settings and waiting-list forms. |
| P2 | [SCH-106](https://linear.app/schedule-app-master/issue/SCH-106/unificirovat-knopki-kalendarya-i-dashboard-utilities): calendar and dashboard utility controls | Audit free slots, date arrows, filters, view selectors and empty/error retry actions; separate navigation and selection from CTA styling. |
| P2 | [SCH-107](https://linear.app/schedule-app-master/issue/SCH-107/soglasovat-ierarhiyu-knopok-publichnoj-zapisi-i-self-service): public booking and customer self-service | Align select/continue/submit and manage appointment confirm/cancel treatment across web and mobile tokens. |
| P3 | [SCH-108](https://linear.app/schedule-app-master/issue/SCH-108/unificirovat-knopki-profilya-vhoda-i-pervichnoj-nastrojki): profile, authentication and setup | Apply red-outline sign-out, neutral dismissal, success primary actions, and destructive confirmation only when data is removed; check all locale variants and target sizes. |

## Accessibility and review checklist

- Filled green primary label has at least 4.5:1 contrast against its surface.
- Red destructive label is paired with clear action text; color is not the only
  signal.
- Keyboard focus is visible on web. Native targets are at least 44×44pt.
- Loading and disabled states remain legible and cannot be activated twice.
- Buttons in one row fit narrow screens and translated RU/CZ/EN labels without
  clipping or overlap.
- Capture narrow and wide viewport evidence for each migrated flow.
