import assert from "node:assert/strict";
import { createBookingDecisionEmail } from "./emailContent.ts";

Deno.test("accepted email contains the confirmed slot in the request locale", () => {
  const email = createBookingDecisionEmail({
    decision: "accepted",
    locale: "cz",
    recipient: "client@example.test",
    serviceName: "Manikúra",
    durationMinutes: 120,
    priceAmount: 1300,
    currency: "CZK",
    startsAt: "2030-01-03T09:00:00.000Z",
    timezone: "Europe/Prague",
    workspaceName: "Studio <Yahor>",
  });

  assert.equal(email.subject, "Vaše rezervace je potvrzena");
  assert.match(email.text, /Služba: Manikúra/);
  assert.match(email.text, /Délka: 120 min/);
  assert.match(email.text, /Cena: 1\u00a0300,00 Kč/);
  assert.match(email.text, /Datum:/);
  assert.match(email.html, /Studio &lt;Yahor&gt;/);
});

Deno.test("declined email does not imply that another slot is available", () => {
  const email = createBookingDecisionEmail({
    decision: "declined",
    locale: "en",
    recipient: "client@example.test",
    serviceName: "Manicure",
    startsAt: "2030-01-03T09:00:00.000Z",
    timezone: "Europe/Prague",
    workspaceName: "Studio",
  });

  assert.equal(email.subject, "Your appointment was not confirmed");
  assert.match(email.text, /This appointment could not be confirmed/);
  assert.equal(email.text.includes("Service:"), false);
  assert.equal(email.text.includes("available"), false);
});

Deno.test("Russian content is translated and interpolated data is escaped", () => {
  const email = createBookingDecisionEmail({
    decision: "accepted",
    locale: "ru",
    recipient: "client@example.test",
    serviceName: "Маникюр <script>",
    startsAt: "2030-01-03T09:00:00.000Z",
    timezone: "Europe/Prague",
    workspaceName: "Студия",
  });

  assert.equal(email.subject, "Запись подтверждена");
  assert.match(email.text, /Услуга: Маникюр <script>/);
  assert.equal(email.html.includes("<script>"), false);
});

for (const [locale, accepted, declined, service] of [
  [
    "sk",
    "Vaša rezervácia je potvrdená",
    "Rezervácia nebola potvrdená",
    "Služba",
  ],
  ["uk", "Ваш запис підтверджено", "Запис не підтверджено", "Послуга"],
] as const) {
  Deno.test(`${locale}: both decisions use the customer's language`, () => {
    const input = {
      locale,
      recipient: "client@example.test",
      serviceName: "Manicure <script>",
      startsAt: "2030-01-03T09:00:00Z",
      timezone: "Europe/Prague",
      workspaceName: "Studio",
    };
    const confirmed = createBookingDecisionEmail({
      ...input,
      decision: "accepted",
    });
    assert.equal(confirmed.subject, accepted);
    assert.ok(confirmed.text.includes(`${service}: Manicure <script>`));
    assert.equal(confirmed.html.includes("<script>"), false);
    assert.equal(
      createBookingDecisionEmail({ ...input, decision: "declined" }).subject,
      declined,
    );
  });
}
