# Schedule Masters — Visual Direction

## Status

**Core product design system — approved**

This document defines the product visual language for Schedule Masters. It applies to the master mobile app and the public booking web experience. Future screens and UI changes must follow these rules and reuse the shared theme tokens and components. Update the system itself when a product need requires a new pattern; do not create one-off visual exceptions silently.

The approved direction is **Shadcn-inspired schedule operations**: neutral
surfaces, high-contrast green primary actions, graphite content and secondary actions,
thin borders, compact typography and pill controls adapted for a master's
daily workflow.

## Product direction

Schedule Masters combines:

- the calm, scan-friendly hierarchy of Shadcn-style interfaces without reusing
  another product's brand, icons, layout or proprietary copy;
- the fast, information-dense daily workflow of Masters Pro;
- the friendly, service-oriented tone needed by independent beauty and wellness
  professionals;
- product-specific decisions that reduce friction for independent professionals in Czechia.

This is a visual reference, not a copy of Fresha. We do not reuse its logo, exact colors, typography, illustrations, icons, screen composition or proprietary copy.

## Design principles

1. **Today first.** The first screen must help a master understand the day within seconds.
2. **Spacious scanning.** Show useful information in clear white surfaces with enough room for quick reading.
3. **One primary action.** Every screen has one obvious next action, such as adding a booking or selecting a time.
4. **Approachable authority.** Green primary actions communicate the next step; graphite content and neutral secondary actions keep the interface calm.
5. **Fast feedback.** Loading, empty, error, success, pressed and disabled states are designed as first-class states.
6. **Language-safe.** RU, CZ, EN, SK and UK labels must fit without changing the core layout. Czech is represented by the `cs` HTML locale while the product locale remains `cz`.
7. **Accessible by default.** Text contrast, 44pt minimum touch targets, visible focus, VoiceOver labels and reduced motion are mandatory.
8. **Calendar actions stay close.** Creating an appointment and creating a break must be available from the same calendar action, without navigating through settings.
9. **Shadcn-inspired simplicity.** Use green primary actions, neutral secondary actions, pill controls, 16px
   cards, semantic status colors and a 4px spacing rhythm. Do not add
   gradients, decorative blobs or competing accent colors.

## Core implementation rules

These rules turn the visual direction into decisions that should stay consistent across screens:

- **Shared page frame:** dashboard tabs use the same page padding, typography hierarchy, surface colors, and shared `DashboardPageHeader`. A page title is graphite and follows the same scale; green is for selected, available, or success states rather than a separate page-heading style.
- **Spacing:** use the 4px rhythm from the token file. Mobile page edges use 16px; section spacing is at least 16px. Related controls may use 8–12px. Do not tune spacing independently on each tab when a shared layout can own it.
- **Fields:** labels sit above controls; input text and selected values are vertically centered. Controls use consistent height, border, focus, disabled, and error treatments. Multi-line notes are top-aligned and use a moderate card radius rather than the pill radius reserved for single-line controls.
- **Date and time:** a date field opens its picker on the first tap and visually reads as actionable, with a calendar affordance where space allows. Keep date, start, and end fields in separate, clearly spaced groups; labels and values must not overlap.
- **Dates:** standalone dates in page headings, cards, and lists use the shared localized day, full month, and year format. Date ranges use abbreviated month names and show the year on both dates, including same-year ranges. Keep full localized weekday dates available to screen readers. Date-only values and backend ISO contracts remain unchanged.
- **Service selection:** support a searchable, categorized list that scales to dozens of services. Use grouped or accordion sections where useful; do not place a long catalog in a native dropdown or force users through a long stack of ungrouped choices.
- **Modal navigation:** use a left-aligned back arrow when the user moves deeper into a flow and can return to the previous level. Use a right-aligned close X when dismissing the whole flow. Both actions have the same 16px edge inset and at least a 44×44pt hit target; keep their centers symmetrical. Modal titles remain centered and do not collide with either action.
- **Icons:** use the Expo-compatible Material Design icon set installed in the mobile app through `@react-native-vector-icons/material-design-icons`. Use named icons, consistent sizes, and accessible labels for icon-only buttons. Do not substitute text glyphs, emoji, or square placeholders. Ensure Expo Font is initialized before icon modules in web builds.
- **Feedback:** successful create, update, and delete actions provide visible confirmation; failures provide a clear message and recovery path. Do not leave users unsure whether an action completed.
- **Button hierarchy:** use one filled green primary action for the main positive next step; use a green outline for secondary actions; use neutral/quiet styling for navigation, filters, and dismissals; use red outline/text for destructive or exit actions such as declining/cancelling a booking, removing an entry, or signing out. Reserve a filled red button for an irreversible destructive confirmation. Do not encode hierarchy by changing button widths arbitrarily: equally important decisions in one action group share equal width, while a less frequent secondary action sits below them with lower visual emphasis. Signing out uses a red outline for emphasis but does not require a destructive confirmation because it does not delete data.
- **Motion:** use short, purposeful transitions for selection and navigation. Respect reduced-motion settings and keep motion from delaying an action or communicating state by itself.
- **Touch and accessibility:** interactive targets are at least 44pt, controls have accessible names and roles, and color is never the only way to communicate state. Check text contrast and long RU/CZ/EN labels when changing shared UI.

The mobile implementation lives in `apps/mobile/src/theme/` and shared components in `apps/mobile/src/components/`. Current examples include `DashboardPageHeader`, `DashboardHeaderAction`, `FullscreenModal`, and reusable date and service picker fields. Extend these shared components when a rule changes instead of forking styling per screen.

The button semantics, app-wide audit, and implementation priorities live in [`button-hierarchy.md`](./button-hierarchy.md). The token `brand.action` is the filled primary action color on both mobile and web; keep platform adapters aligned with that token.

## Tone

Bright, clear, confident and approachable. The master app should feel polished
and trustworthy rather than clinical. The booking page may be welcoming, but it
must remain focused on completing a booking.

## Tokens

The canonical machine-readable values are in [`design-tokens.json`](./design-tokens.json). NativeWind and Tailwind aliases should be generated from these semantic tokens rather than introducing app-local colors.

### Color

The palette uses an off-white canvas, crisp white information blocks, green
primary actions and graphite content. Thin borders and minimal shadows
provide hierarchy without heavy chrome.

- `brand.primary` — links, active states and selected controls.
- `brand.primaryStrong` — pressed states and high-emphasis links.
- `brand.action` — green primary action surfaces; `brand.actionPressed` is the darker pressed state.
- `brand.accent` / `brand.accentSoft` — the restrained green used for available
  time, active navigation, successful actions and progress.
- `surface.canvas` — warm off-white application background.
- `surface.raised` — cards, sheets and booking panels.
- `surface.subtle` — input backgrounds and secondary regions.
- `content.primary` / `content.secondary` / `content.muted` — hierarchy.
- `status.*` — success, warning, danger and informational feedback.

Do not use raw hex values in screens. If a new color is needed, add it here with a semantic name and a documented reason.

### Typography

Use the platform system font: San Francisco on iOS and the native system
sans-serif on Android. The system uses one disciplined sans-serif family, medium
UI weights and heavier weights only for screen-level hierarchy. Do not introduce
decorative serif typography into operational screens.

- Display: 36px, high-emphasis screen titles.
- Heading: 30px, screen and primary section titles.
- Section: 24px, card and content-group titles.
- Body: 16px, descriptions and form content.
- Label: 14px, buttons and important metadata.
- Caption: 12px, supporting information only; never use caption text for required actions.

### Spacing and shape

Use a 4px base scale. Standard screen padding is 16px on mobile and 32px on desktop. Use pill shapes for buttons, inputs, language selectors, status badges and bottom navigation. Use 16px rounded cards, thin borders and minimal shadows for grouped surfaces.

### Shadcn-inspired surface rules

- **Master Dashboard and Calendar:** off-white canvas, crisp white panels,
  green primary actions, graphite content, a restrained green accent, thin borders, comfortable metadata
  and no decorative gradients.
- **Mobile navigation:** one white outer pill with a soft green pill beneath
  the active tab. The active icon and label use deep slate, while inactive items
  remain neutral. The active indicator moves with a short, functional native
  animation; the booking CTA floats above the navigation as a green pill.
- **Master forms and settings:** high-contrast labels, clear focus borders and compact controls with predictable dimensions.
- **Public Booking Page:** the same off-white canvas with crisp white panels and
  more welcoming spacing, while retaining the same semantic tokens and accessibility rules.
- **All surfaces:** use Inter/system UI for operational text. Monospace is reserved for optional technical metadata, never for client-facing booking content.

### Motion

Motion is functional only: 160ms for micro-interactions and 220ms for panels or route-level transitions. Respect `prefers-reduced-motion` and the equivalent native accessibility setting.

## Screen specifications

### 1. Master Dashboard / Today

**Purpose:** give the master an immediate view of today and the fastest path to create or manage a booking.

**First viewport order:**

1. Compact top bar: current date and locale-independent status affordances.
2. Greeting plus a concise date label.
3. Primary action: floating `New booking` action above the bottom navigation.
4. Today summary: number of bookings, received revenue and next appointment. Received revenue starts at zero and grows only after the master saves payment for a completed appointment. Keep it visible in the first viewport.
5. Chronological appointment list with status, client name, service and time.
6. Empty gaps/free slots affordance, with a visible action to start a booking in that gap.

**Primary states:**

- Loading: preserve the layout with lightweight skeleton rows.
- Empty day: explain that no bookings exist and keep `New booking` prominent.
- Error: show a compact retry state without hiding local navigation.

**Interaction rules:**

- Place previous/next day controls beside the centered day label and date in one header group; do not reserve a separate row for the arrows.
- Tapping an appointment opens its details.
- Tapping a free slot starts a booking with date/time prefilled.
- Revenue is informational and never competes with the booking CTA.
- Bookings and received revenue share one grouped summary surface. Bookings
  stays neutral; received revenue uses a graphite value with a restrained green
  accent without turning the entire summary into a high-saturation block.
- The quick-add action offers `Appointment` and `Break` as two equally clear choices.

### 2. Master Calendar

**Purpose:** manage availability and appointments with the least possible navigation.

**Structure:**

1. Day/week switcher, with day view as the MVP default.
2. Date navigation with a clear selected date.
3. Working-hours timeline with 30-minute visual increments.
4. Appointment blocks sized according to service duration; manual bookings use
   the established green, while online bookings use a muted palette-aligned
   violet, with a shared legend in day and week views.
5. Master-created breaks and unavailable time use a soft danger surface and red
   edge/text to communicate that the time is blocked without turning the
   calendar into a high-saturation alert. This treatment remains distinct from
   both booking sources.
6. Free slots visibly distinct from booked time and remain tappable.
7. Bottom/right primary action for adding an appointment or break.

**Interaction rules:**

- Selecting an empty slot offers a new booking or a pause, with the selected date and time prefilled.
- Selecting a pause in the day or week calendar opens its editable details; updates use the workspace timezone and reject overlaps.
- The add action supports both a client appointment and a personal break from the same entry point.
- Selecting a booking opens details and actions for reschedule/cancel according to the booking lifecycle.
- Unavailable time and breaks are visually muted and not selectable.
- Appointment blocks may show a short status label (new, confirmed, cancelled) but must not rely on color alone. Keep the source legend visible in day and week views and expose the source in the event's accessible label.

**Responsive behavior:**

- Mobile: vertically scrollable day timeline with a sticky date header.
- Web booking does not expose the master calendar; it exposes only eligible free slots.

### 3. Public Booking Page

**Purpose:** let a client complete a booking from a shared link without needing an account first.

**First viewport order:**

1. Master identity: name, specialty/category and optional avatar.
2. Short value proposition or location information.
3. Service selection with duration and price.
4. Date and available-time selection.
5. Client contact form.
6. Booking summary and confirmation CTA.

**Interaction rules:**

- The selected service and time remain visible in the summary.
- The client does not need to create a password before the first booking.
- Validation is inline and written in the selected locale.
- The page must work well from an Instagram/WhatsApp link on a small screen.
- After a completed or cancelled appointment, the client should have a clear path to book again from the same master page or link.

**States:**

- Loading services/slots.
- No availability for the selected date.
- Invalid or expired public link.
- Booking conflict after slot selection.
- Successful confirmation with date, time, service and master contact details.

## Navigation direction

### Mobile master app

Use a small fixed bottom navigation with five primary destinations:

- Today
- Calendar
- Customers
- Finances
- Profile

This is an information architecture decision, not only a visual grouping:

- **Today** is the default operational surface. It answers “what is happening
  today?” with bookings, the next client, daily totals and received revenue.
- **Calendar** is the planning surface. It answers “when am I available?” with
  the timeline, free slots, breaks and appointment creation.
- **Customers** supports customer lookup and customer history.
- **Finances** gives a quick view of expected and actual income.

Profile is a low-frequency configuration surface with a dedicated bottom navigation destination. It contains the master profile, public booking link, language, subscription, and settings. Do not duplicate profile navigation actions in page headers.

The destinations are intentionally ordered by frequency of use. Messages,
Explore, Inbox and client discovery are not MVP destinations: adding them now
would compete with the booking workflow and make the navigation less useful.

Keep settings and subscription inside Profile. Messaging is deferred from the MVP navigation.

Place the primary `New booking` action as a compact floating button immediately
above the bottom navigation. It must remain reachable while a master scrolls and
must not cover a selected tab or important information. There must be no second
`Add booking` button on the Today screen. The action opens the shared booking
creation flow.

`New booking` is a global creation action, not a navigation destination. Its role is
to start a client appointment quickly from Today or Calendar. Calendar remains
the place for choosing a time and for creating a break, so the two actions do
not compete with one another.

### Booking web

Do not reproduce the master app navigation. The booking page is a focused, linear flow with back navigation and a compact language selector.

## Component inventory for implementation

The first shared primitives should be:

- `Button`, `IconButton`, `LinkButton`;
- `Text`, `Heading`, `Label`, `Caption`;
- `Card`, `Surface`, `Badge`, `Divider`;
- `TextField`, `PhoneField`, `Select`, `DatePicker`, `TimeSlot`;
- `AppointmentRow`, `AppointmentBlock`, `ServiceRow`;
- `BreakBlock`, `FreeSlot`, `QuickAddMenu`;
- `LoadingState`, `EmptyState`, `ErrorState`, `Toast`;
- `BottomNavigation` for mobile and `LanguagePicker` for web.

Use platform-specific implementations where native semantics differ. Keep business logic in app/feature layers, not in the UI primitives.

## Visual QA acceptance criteria

- The first viewport communicates the current task without marketing content.
- Dashboard revenue and next appointment are visible without opening another screen.
- Appointment and break creation are both reachable from the calendar in one deliberate interaction.
- Free time is visually actionable, not just empty background.
- No screen contains nested cards without a clear hierarchy reason.
- Primary actions are visually unique and reachable with one hand on mobile.
- RU, CZ and EN labels do not overflow or hide controls.
- Interactive controls meet the 44pt minimum target.
- Loading, empty, error, disabled, focus and pressed states exist for all primary flows.
- Light mode is the MVP baseline; dark mode is not required until the token structure is validated.
- Screens are reviewed at small iOS width, larger iOS width and desktop booking width.
