# Pilot release acceptance (SCH-157)

Reviewed on 2026-11-11 against main revision
`8f1fef3b0aa5543fb71e7ffb10483f975ca5d7f5` and the shared pilot project
`jakksxrebisudkecednm`. [Main CI](https://github.com/stupendusmagneficus/schedule-masters/actions/runs/43014196411)
passed against isolated local Supabase. The hosted probes below used the
booking-web publishable key. They recorded status and counts only.

| Check | Expected | Observed | Owner |
| --- | --- | --- | --- |
| Pilot configuration and migrations | Both clients target the pilot project and the migration inventory matches main. | Local client configurations matched. Hosted project was healthy. All 67 migration IDs matched, through `20261111000100`. | Release operator |
| Public booking context and availability | An existing public booking link returns its catalog and can find a slot for two services. | `volno` returned HTTP 200 with three services. Availability for two services on 2026-11-12 returned HTTP 200 and six slots. | Release operator |
| Deployed Edge Functions | The decision worker, translator and budget alerts require JWTs. The webhook authenticates with its signed callback. | Management inventory reported all four active. JWT flags matched. Versions were 10 for the email worker, 8 for translation, and 5 each for alerts and the webhook. A build commit could not be established from this inventory. | Release operator |
| Hosted client builds | Record the two client URLs and their build commits. | The repository has no recorded GitHub deployment or backend workflow run. Local environment validation establishes only the backend target. | Release operator |
| Hosted booking lifecycle | A public multi-service request reaches the master. The slot is unavailable after confirmation and becomes available after cancellation. | Pending against hosted clients. The local browser journey passed in main CI. Use an isolated pilot workspace and a controlled recipient. | Pilot owner and release operator |
| Hosted Auth and email | Confirmation and decision messages reach the controlled inbox. The signed delivery event updates the status. | Resend, sender and delivery flag entries exist. Their presence does not verify activation, sender DNS, inbox receipt, or webhook delivery. | Pilot owner and release operator, SCH-146 |
| Hosted AI translation | A test generation returns an editable suggestion and updates usage within the configured budget. | Translation route is active. No `OPENAI_API_KEY` entry was present in the pilot function inventory. | Pilot owner and release operator, SCH-148 |
| Native iPhone pilot | A named build passes sign-in, deep link, calendar, booking and cancellation on the device. | Pending. The iOS app configuration has the app scheme, but no explicit bundle identifier or committed EAS profile was found at the reviewed revision. | Pilot owner, SCH-57 |

## Hosted booking lifecycle

1. Record the booking-web and master client URLs and build commits. Sign in as
   the owner of an isolated pilot workspace. Publish two services and choose an
   empty time on its test schedule. Record the time and timezone.
2. Open the public link in a separate browser session. Select both services,
   then submit one request using the controlled recipient. Record the expected
   combined duration and amount and confirm that the master sees both.
3. Confirm the request. Refresh public availability and verify the original
   start is absent. Cancel from the master calendar and verify the start returns.
4. Record the actual outcomes and any failed step in this matrix. Remove
   temporary data through the isolated workspace's cleanup procedure. For
   delivery verification, follow the controlled inbox and provider checks in
   the [email runbook](booking-decision-email-production.md).

If a client release blocks the pilot, return to the previous known-good client
build. For backend changes, use the function and forward-migration rollback
procedures in [Backend release](backend-release.md).
