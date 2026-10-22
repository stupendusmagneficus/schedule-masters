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
  assert.match(email.text, /Délka: 2 hodiny/);
  assert.match(email.text, /Cena: 1\u00a0300,00 Kč/);
  assert.match(email.text, /Datum:/);
  assert.match(email.html, /Studio &lt;Yahor&gt;/);
  assert.match(email.html, /<html lang="cs">/);
  assert.match(email.html, /name="viewport"/);
  assert.match(email.html, /SCHEDULE MASTERS/);
  assert.match(email.text, /Europe\/Prague/);
  assert.ok(email.preheader.includes("Studio <Yahor>"));
  assert.equal(email.html.includes("client@example.test"), false);
});

for (const [locale, duration] of [
  ["en", "1 hour 30 minutes"],
  ["cz", "1 hodina 30 minut"],
  ["sk", "1 hodina 30 minút"],
  ["ru", "1 час 30 минут"],
  ["uk", "1 година 30 хвилин"],
] as const) {
  Deno.test(`${locale}: preview, text and HTML agree on appointment details`, () => {
    const email = createBookingDecisionEmail({
      decision: "accepted",
      locale,
      recipient: "client@example.test",
      serviceName: "Manicure & pedicure",
      durationMinutes: 90,
      startsAt: "2030-01-03T23:30:00Z",
      timezone: "Europe/Prague",
      workspaceName: "Studio",
    });
    assert.ok(email.text.includes(duration));
    assert.ok(email.html.includes(duration));
    assert.ok(email.html.includes(email.preheader));
    assert.match(email.html, /Manicure &amp; pedicure/);
    assert.equal(email.html.includes("<img"), false);
    assert.equal(email.html.includes("href="), false);
  });
}

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

Deno.test("request, cancellation and master events have distinct localized meanings", () => {
  for (const locale of ["en", "cz", "sk", "ru", "uk"] as const) {
    const base = {
      locale,
      recipient: "client@example.test",
      serviceName: "Service",
      startsAt: "2030-01-03T09:00:00Z",
      timezone: "Europe/Prague",
      workspaceName: "Studio",
      customerName: "<Client>",
    };
    const received = createBookingDecisionEmail({
      ...base,
      decision: "request_received",
    });
    const cancelled = createBookingDecisionEmail({
      ...base,
      decision: "cancelled_by_master",
      occurrenceStarts: [base.startsAt, "2030-01-10T09:00:00Z"],
    });
    const master = createBookingDecisionEmail({
      ...base,
      decision: "master_request_received",
    });
    assert.notEqual(received.subject, cancelled.subject);
    assert.notEqual(master.subject, received.subject);
    assert.match(master.html, /&lt;Client&gt;/);
    assert.ok(cancelled.text.includes("2030"));
    assert.ok(!received.html.includes("href="));
  }
});
Deno.test("confirmed email includes a safe management action and fragment link in plain text", () => {
  const url = `https://book.example.test/#token=${"a".repeat(128)}`;
  const email = createBookingDecisionEmail({
    decision: "accepted",
    locale: "en",
    recipient: "client@example.test",
    serviceName: "Service",
    startsAt: "2030-01-03T09:00:00Z",
    timezone: "Europe/Prague",
    workspaceName: "Studio",
    manageUrl: url,
  });
  assert.ok(email.html.includes(url));
  assert.ok(email.text.includes(url));
});
