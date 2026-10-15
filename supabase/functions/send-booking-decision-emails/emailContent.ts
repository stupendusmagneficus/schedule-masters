export type BookingDecisionEmail = {
  readonly decision: "accepted" | "declined";
  readonly locale: "ru" | "cz" | "en";
  readonly recipient: string;
  readonly serviceName: string;
  readonly startsAt: string;
  readonly timezone: string;
  readonly workspaceName: string;
};

const copy = {
  ru: {
    accepted: "Запись подтверждена",
    declined: "Запись не подтверждена",
    greeting: "Здравствуйте!",
    acceptedBody: "Мастер подтвердил вашу запись.",
    declinedBody: "Эту запись не удалось подтвердить.",
    service: "Услуга",
    date: "Дата",
    time: "Время",
    footer:
      "Это информационное сообщение о вашей заявке. На него не нужно отвечать.",
  },
  cz: {
    accepted: "Vaše rezervace je potvrzena",
    declined: "Rezervace nebyla potvrzena",
    greeting: "Dobrý den,",
    acceptedBody: "Vaše rezervace byla potvrzena.",
    declinedBody: "Tuto rezervaci se nepodařilo potvrdit.",
    service: "Služba",
    date: "Datum",
    time: "Čas",
    footer:
      "Toto je informační zpráva o vaší žádosti. Na zprávu nemusíte odpovídat.",
  },
  en: {
    accepted: "Your appointment is confirmed",
    declined: "Your appointment was not confirmed",
    greeting: "Hello,",
    acceptedBody: "Your appointment has been confirmed.",
    declinedBody: "This appointment could not be confirmed.",
    service: "Service",
    date: "Date",
    time: "Time",
    footer:
      "This is an informational message about your booking request. No reply is needed.",
  },
} as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function createBookingDecisionEmail(input: BookingDecisionEmail) {
  const locale = input.locale === "cz" ? "cs-CZ" : input.locale;
  const messages = copy[input.locale];
  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: input.timezone,
  }).format(new Date(input.startsAt));
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: input.timezone,
  }).format(new Date(input.startsAt));
  const subject =
    input.decision === "accepted" ? messages.accepted : messages.declined;
  const body =
    input.decision === "accepted"
      ? messages.acceptedBody
      : messages.declinedBody;
  const details =
    input.decision === "accepted"
      ? [
          `${messages.service}: ${input.serviceName}`,
          `${messages.date}: ${date}`,
          `${messages.time}: ${time}`,
        ]
      : [];
  const text = [
    messages.greeting,
    "",
    body,
    ...(details.length ? ["", ...details] : []),
    "",
    input.workspaceName,
    messages.footer,
  ].join("\n");
  const htmlDetails = details
    .map((detail) => `<li>${escapeHtml(detail)}</li>`)
    .join("");
  const html = [
    `<p>${escapeHtml(messages.greeting)}</p>`,
    `<p>${escapeHtml(body)}</p>`,
    htmlDetails ? `<ul>${htmlDetails}</ul>` : "",
    `<p><strong>${escapeHtml(input.workspaceName)}</strong></p>`,
    `<p>${escapeHtml(messages.footer)}</p>`,
  ].join("");

  return { html, subject, text };
}
