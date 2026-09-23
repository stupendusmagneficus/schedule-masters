# MVP Analytics Event Contract

## Purpose

Schedule Masters uses explicit, product-owned events for the MVP. Autocapture,
session replay, keystroke capture, email, phone, names, booking notes, raw
URLs, workspace IDs, and appointment IDs are not collected.

The client sends events to the configured EU PostHog ingestion endpoint using a
random, locally persisted `distinct_id`. The analytics package is provider
neutral, so the ingestion provider can be replaced without changing product
code.

## Events

| Event | When it is emitted | Allowed properties |
| --- | --- | --- |
| `app_opened` | Mobile app starts | none |
| `account_signed_up` | Account creation succeeds | none |
| `account_signed_in` | Sign-in succeeds | none |
| `workspace_setup_completed` | Initial workspace setup succeeds | `locale` |
| `first_service_created` | First service is created | `locale` |
| `working_hours_saved` | Working hours are saved | `locale` |
| `booking_link_created` | Public booking link is created | `locale` |
| `booking_page_viewed` | Public booking page is opened | none |
| `booking_slot_selected` | Visitor selects a slot | `locale` |
| `public_booking_submitted` | Visitor submits a booking | `locale` |
| `public_booking_succeeded` | Booking is accepted | `locale`, `mode` |
| `public_booking_failed` | Booking request fails | `locale`, `reason` |
| `appointment_created` | Authenticated appointment is created | `source` |
| `appointment_rescheduled` | Appointment is rescheduled | `source` |
| `appointment_cancelled` | Appointment is cancelled | `actor` |
| `booking_reused` | Existing client books again | none |
| `reminder_sent` | Reminder delivery is accepted | `channel` |
| `subscription_trial_started` | Trial starts | `plan` |
| `subscription_changed` | Subscription plan changes | `from_plan`, `to_plan` |

Property values must be enums or non-sensitive aggregates. Never add a raw
Supabase error, customer input, email, phone, name, note, slug, or identifier.

## MVP metrics

- Activation rate: workspaces with `workspace_setup_completed` / accounts with
  `account_signed_up`.
- Booking conversion: sessions with `public_booking_succeeded` / sessions with
  `booking_page_viewed`.
- Booking failure rate: `public_booking_failed` /
  (`public_booking_succeeded` + `public_booking_failed`).
- Repeat booking rate: visitors with `booking_reused` / visitors with at least
  one `public_booking_succeeded`.
- Pilot weekly active masters: distinct users with any authenticated product
  event in a rolling seven-day period.

## Provider setup

Create an EU PostHog project, then configure:

- `EXPO_PUBLIC_ANALYTICS_API_KEY` and `EXPO_PUBLIC_ANALYTICS_HOST` for mobile;
- `NEXT_PUBLIC_ANALYTICS_API_KEY` and `NEXT_PUBLIC_ANALYTICS_HOST` for booking
  web.

The public project key is safe to ship to clients. It is not an admin token.
If analytics is not configured, the client becomes a no-op and the product
continues working.
