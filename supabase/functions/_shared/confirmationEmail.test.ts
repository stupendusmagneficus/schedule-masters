import assert from "node:assert/strict";
import { createConfirmationEmail } from "./confirmationEmail.ts";

for (const [locale, htmlLanguage, title] of [
  ["en", "en", "Confirm your email"],
  ["cz", "cs", "Potvrďte svůj e-mail"],
  ["sk", "sk", "Potvrďte svoj e-mail"],
  ["ru", "ru", "Подтвердите email"],
  ["uk", "uk", "Підтвердьте email"],
] as const) {
  Deno.test(`${locale}: confirmation uses one language in its subject, HTML and text`, () => {
    const url = "https://auth.example.test/verify?token=test&type=signup";
    const email = createConfirmationEmail(locale, url);
    assert.equal(email.subject, `Schedule Masters — ${title}`);
    assert.ok(email.text.includes(title));
    assert.ok(email.text.includes(url));
    assert.ok(email.html.includes(`<html lang="${htmlLanguage}">`));
    assert.ok(email.html.includes(email.preheader));
    assert.ok(email.html.includes("token=test&amp;type=signup"));
    assert.equal(email.html.includes("<img"), false);
    assert.equal(email.html.includes("{{"), false);
    if (locale !== "en")
      assert.equal(email.html.includes("Confirm your email"), false);
  });
}

Deno.test("missing or malformed metadata falls back to English", () => {
  const expected = createConfirmationEmail("en", "https://auth.example.test");
  for (const locale of [undefined, null, 42, {}, "<script>", "fr"]) {
    assert.deepEqual(
      createConfirmationEmail(locale, "https://auth.example.test"),
      expected,
    );
  }
});
