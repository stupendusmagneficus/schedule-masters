import { emailLocales } from "./confirmationEmail.ts";
import { buildRecoveryTemplate, createRecoveryEmail } from "./recoveryEmail.ts";

for (const locale of emailLocales) {
  Deno.test(`recovery email uses shared layout and ${locale} copy`, () => {
    const email = createRecoveryEmail(
      locale,
      "https://example.test/reset?a=1&b=2",
    );
    if (
      !email.html.includes(`lang="${locale === "cz" ? "cs" : locale}"`) ||
      !email.html.includes("a=1&amp;b=2")
    )
      throw new Error("Invalid localized recovery layout");
    if (
      !email.text.includes("https://example.test/reset?a=1&b=2") ||
      !email.subject.startsWith("Schedule Masters — ")
    )
      throw new Error("Missing recovery alternative");
  });
}
Deno.test("recovery template defaults untrusted metadata and keeps Auth link", () => {
  if (
    createRecoveryEmail({ locale: "ru" }, "https://example.test").subject !==
    createRecoveryEmail("en", "https://example.test").subject
  )
    throw new Error("Unsafe locale");
  const template = buildRecoveryTemplate();
  if (
    !template.html.includes("{{ .ConfirmationURL }}") ||
    !template.subject.includes('printf "%v" .Data.locale')
  )
    throw new Error("Missing Auth template contract");
});
