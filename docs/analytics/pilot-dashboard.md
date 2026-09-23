# Pilot Dashboard

Create these panels in the EU PostHog project after the project key is
configured. Use the last 30 days and filter by `platform` when comparing web
and mobile.

| Panel | Definition |
| --- | --- |
| New accounts | Unique users with `account_signed_up` by week |
| Activation funnel | `account_signed_up` → `workspace_setup_completed` |
| Booking funnel | `booking_page_viewed` → `booking_slot_selected` → `public_booking_submitted` → `public_booking_succeeded` |
| Booking failures | Count and rate of `public_booking_failed` by `reason` |
| Repeat usage | Unique users with `booking_reused` by week |
| Pilot active masters | Unique users with authenticated events in a rolling 7-day window |

Do not create dashboards grouped by email, phone, name, workspace ID, booking
ID, or free-form error text. These properties are intentionally not sent by
the client.
