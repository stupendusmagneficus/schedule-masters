import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  createConfirmationEmail,
  emailLocales,
} from "../../supabase/functions/_shared/confirmationEmail.ts";
import { createBookingDecisionEmail } from "../../supabase/functions/send-booking-decision-emails/emailContent.ts";

const directory = fileURLToPath(
  new URL("../../artifacts/emails/", import.meta.url),
);
mkdirSync(directory, { recursive: true });
const links = [];
for (const locale of emailLocales) {
  for (const kind of ["accepted", "declined", "confirmation"]) {
    const email =
      kind === "confirmation"
        ? createConfirmationEmail(locale, "https://example.test/confirm")
        : createBookingDecisionEmail({
            decision: kind,
            locale,
            recipient: "preview@example.test",
            serviceName: "Manikúra + pedikúra / Маникюр + педикюр",
            durationMinutes: 150,
            priceAmount: 2600,
            currency: "CZK",
            startsAt: "2030-01-03T09:00:00Z",
            timezone: "Europe/Prague",
            workspaceName: "Studio Kateřina · Prague",
            supportEmail: "support@example.test",
          });
    const name = `${locale}-${kind}`;
    writeFileSync(`${directory}${name}.html`, email.html);
    writeFileSync(
      `${directory}${name}.txt`,
      `${email.subject}\n\n${email.text}\n`,
    );
    links.push(
      `<li><a href="${name}.html">${name}</a> · <a href="${name}.txt">text</a></li>`,
    );
  }
}
writeFileSync(
  `${directory}index.html`,
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Email previews</title></head><body><h1>Email previews — fixture data only</h1><ul>${links.join("")}</ul></body></html>`,
);
console.log(`Preview fixtures: ${directory}index.html`);
