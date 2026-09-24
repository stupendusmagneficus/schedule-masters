# Schedule Masters — Visual Direction

## Status

**Approved direction for MVP implementation**

This document is the source of truth for the first visual language of Schedule Masters. It applies to the master mobile app and the public booking web experience.

The approved direction is **GitHub Mobile-inspired operations**: calm cool-neutral
surfaces, white information blocks, calm green actions and compact
navigation adapted for a master’s daily workflow.

## Product direction

Schedule Masters combines:

- the calm, scan-friendly hierarchy of GitHub Mobile without reusing its brand,
  icons, layout or proprietary copy;
- the fast, information-dense daily workflow of Masters Pro;
- the friendly, service-oriented tone needed by independent beauty and wellness
  professionals;
- product-specific decisions that reduce friction for independent professionals in Czechia.

This is a visual reference, not a copy of Fresha. We do not reuse its logo, exact colors, typography, illustrations, icons, screen composition or proprietary copy.

## Design principles

1. **Today first.** The first screen must help a master understand the day within seconds.
2. **Quiet density.** Show useful information without decorative surfaces or nested cards.
3. **One primary action.** Every screen has one obvious next action, such as adding a booking or selecting a time.
4. **Calm operational clarity.** The interface should feel trustworthy and
   lightweight without looking corporate or clinical.
5. **Fast feedback.** Loading, empty, error, success, pressed and disabled states are designed as first-class states.
6. **Language-safe.** RU, CZ and EN labels must fit without changing the core layout. Czech is represented by the `cs` HTML locale while the product locale remains `cz`.
7. **Accessible by default.** Text contrast, 44pt minimum touch targets, visible focus, VoiceOver labels and reduced motion are mandatory.
8. **Calendar actions stay close.** Creating an appointment and creating a break must be available from the same calendar action, without navigating through settings.

## Tone

Calm, clear, warm, practical and modern. The master app should feel precise rather than decorative. The booking page may be more editorial and welcoming, but it must remain focused on completing a booking.

## Tokens

The canonical machine-readable values are in [`design-tokens.json`](./design-tokens.json). NativeWind and Tailwind aliases should be generated from these semantic tokens rather than introducing app-local colors.

### Color

The palette uses cool-neutral application surfaces, white information blocks,
thin neutral separators and a reserved green action color. The result borrows
GitHub Mobile’s scanning rhythm, not its visual identity or exact values.

- `brand.primary` — primary actions and active states.
- `brand.primaryStrong` — pressed states and high-emphasis links.
- `surface.canvas` — warm application background.
- `surface.raised` — cards, sheets and booking panels.
- `surface.subtle` — input backgrounds and secondary regions.
- `content.primary` / `content.secondary` / `content.muted` — hierarchy.
- `status.*` — success, warning, danger and informational feedback.

Do not use raw hex values in screens. If a new color is needed, add it here with a semantic name and a documented reason.

### Typography

Use the platform system font: San Francisco on iOS and the native system sans-serif on Android. Typography follows the iOS product rhythm while allowing Dynamic Type scaling. Headings retain a warm editorial feel through weight and spacing rather than a decorative font.

- Display: 34px, dashboard greeting and booking profile title.
- Heading: 28px, section and screen titles.
- Section: 20px, card and content-group titles.
- Body: 17px, descriptions and form content.
- Label: 15px, buttons and important metadata.
- Caption: 13px, supporting information only; never use caption text for required actions.

### Spacing and shape

Use a 4px base scale. Standard screen padding is 16px on mobile and 32px on desktop. Use 8px for compact controls, 16px for normal controls and 18px for grouped surfaces. Reserve pill shapes for status badges, segmented controls, bottom navigation and genuinely compact choice controls; do not make every surface a pill.

### GitHub Mobile-inspired surface rules

- **Master Dashboard and Calendar:** cool-neutral canvas, white raised panels,
  calm green actions, thin borders, compact metadata and no decorative gradients.
- **Mobile navigation:** one white outer pill with a light-green pill beneath
  the active tab. The active icon and label use the green accent, while inactive
  items remain neutral. The active indicator moves with a short, functional
  native animation; the booking CTA floats above the navigation as a green pill.
- **Master forms and settings:** high-contrast labels, clear focus borders and compact controls with predictable dimensions.
- **Public Booking Page:** warmer canvas, slightly softer panels and more welcoming spacing, while retaining the same semantic tokens and accessibility rules.
- **All surfaces:** use Inter/system UI for operational text. Monospace is reserved for optional technical metadata, never for client-facing booking content.

### Motion

Motion is functional only: 160ms for micro-interactions and 220ms for panels or route-level transitions. Respect `prefers-reduced-motion` and the equivalent native accessibility setting.

## Screen specifications

### 1. Master Dashboard / Today

**Purpose:** give the master an immediate view of today and the fastest path to create or manage a booking.

**First viewport order:**

1. Compact top bar: current date, profile/settings entry and locale-independent status affordances.
2. Greeting plus a concise date label.
3. Primary action: floating `New booking` action above the bottom navigation.
4. Today summary: number of bookings, expected revenue and next appointment. Expected revenue stays visible in the first viewport.
5. Chronological appointment list with status, client name, service and time.
6. Empty gaps/free slots affordance, with a visible action to start a booking in that gap.

**Primary states:**

- Loading: preserve the layout with lightweight skeleton rows.
- Empty day: explain that no bookings exist and keep `New booking` prominent.
- Error: show a compact retry state without hiding local navigation.

**Interaction rules:**

- Tapping an appointment opens its details.
- Tapping a free slot starts a booking with date/time prefilled.
- Revenue is informational and never competes with the booking CTA.
- Bookings and expected revenue share one grouped summary surface. Bookings
  stays neutral; expected revenue uses the strong green text accent without a
  full-color background.
- The quick-add action offers `Appointment` and `Break` as two equally clear choices.

### 2. Master Calendar

**Purpose:** manage availability and appointments with the least possible navigation.

**Structure:**

1. Day/week switcher, with day view as the MVP default.
2. Date navigation with a clear selected date.
3. Working-hours timeline with 30-minute visual increments.
4. Appointment blocks sized according to service duration.
5. Break blocks and unavailable time visibly distinct from booked time.
6. Free slots visibly distinct from booked time and remain tappable.
7. Bottom/right primary action for adding an appointment or break.

**Interaction rules:**

- Selecting an empty slot opens the booking flow with the slot preselected.
- The add action supports both a client appointment and a personal break from the same entry point.
- Selecting a booking opens details and actions for reschedule/cancel according to the booking lifecycle.
- Unavailable time and breaks are visually muted and not selectable.
- Appointment blocks may show a short status label (new, confirmed, cancelled) but must not rely on color alone.

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

Use a small fixed bottom navigation with three primary destinations:

- Today
- Calendar
- Profile

This is an information architecture decision, not only a visual grouping:

- **Today** is the default operational surface. It answers “what is happening
  today?” with bookings, the next client, daily totals and expected revenue.
- **Calendar** is the planning surface. It answers “when am I available?” with
  the timeline, free slots, breaks and appointment creation.
- **Profile** is the low-frequency configuration surface. It contains the
  master profile, public booking link, language, subscription and settings.

The destinations are intentionally ordered by frequency of use. Messages,
Explore, Inbox and client discovery are not MVP destinations: adding them now
would compete with the booking workflow and make the navigation less useful.

Keep settings and subscription inside Profile. Messaging is deferred from the MVP navigation.

Place the primary `New booking` action as a compact floating button immediately
above the bottom navigation. It must remain reachable while a master scrolls and
must not cover a selected tab or important information. There must be no second
`Add booking` button on the Today screen. The action opens the booking creation
flow when that flow is implemented; until then it must clearly state that the
flow is not available rather than silently doing nothing.

`New booking` is a global creation action, not a fourth destination. Its role is
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
