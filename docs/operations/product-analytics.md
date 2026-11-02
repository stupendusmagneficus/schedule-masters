# Product analytics event contract

The mobile and booking-web applications use `@schedule-app/analytics` to send
explicit events to the configured PostHog-compatible endpoint. With no API key,
tracking is disabled. An anonymous, persistent device/browser identifier is
generated locally; it is pseudonymous and is not proof of consent.

Only fixed property names and values are accepted by the shared client. The
currently used properties are the five supported locales, `mode: demo` for a
demo booking success, `reason: request_failed` for a public booking failure,
and `source: master_created` for a manually created appointment. The client
always adds its own `platform`. Unknown properties and values are dropped,
including service names, contacts, notes, IDs, free text and raw errors. Add a
new approved property only with an explicit finite value set and tests.

Current observed flow: booking page viewed, time selected, public booking
submitted, succeeded or failed; mobile sign-up/sign-in, workspace setup and
manual appointment creation. Demo booking success does not emit a submission
event. Service selection, delivery and visit completion are not currently
instrumented; constants alone do not mean an event is emitted. Events are
best-effort and are not a source of truth for financial or booking reports.

This contract does not configure a provider, establish consent or legal basis,
define retention, guarantee delivery, or provide a dashboard. These decisions
and end-to-end validation must be completed for the target environment before
relying on product analytics.
