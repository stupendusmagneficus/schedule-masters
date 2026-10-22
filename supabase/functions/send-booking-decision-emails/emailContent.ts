import { renderEmailLayout } from "../_shared/emailLayout.ts";

export type BookingDecisionEmail = {
  readonly decision: "accepted" | "declined";
  readonly locale: "en" | "cz" | "sk" | "ru" | "uk";
  readonly recipient: string;
  readonly serviceName: string;
  readonly durationMinutes?: number;
  readonly priceAmount?: number;
  readonly currency?: string;
  readonly startsAt: string;
  readonly timezone: string;
  readonly workspaceName: string;
  readonly supportEmail?: string;
};

const copy = {
  ru: {
    accepted: "Запись подтверждена",
    declined: "Запись не подтверждена",
    greeting: "Здравствуйте!",
    acceptedBody: "Мастер подтвердил вашу запись.",
    declinedBody: "Эту запись не удалось подтвердить.",
    service: "Услуга",
    duration: "Длительность",
    price: "Стоимость",
    date: "Дата",
    time: "Время",
    timezone: "Часовой пояс",
    support: "Вопросы о приложении",
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
    duration: "Délka",
    price: "Cena",
    date: "Datum",
    time: "Čas",
    timezone: "Časové pásmo",
    support: "Dotazy k aplikaci",
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
    duration: "Duration",
    price: "Price",
    date: "Date",
    time: "Time",
    timezone: "Time zone",
    support: "Questions about the app",
    footer:
      "This is an informational message about your booking request. No reply is needed.",
  },
  sk: {
    accepted: "Vaša rezervácia je potvrdená",
    declined: "Rezervácia nebola potvrdená",
    greeting: "Dobrý deň,",
    acceptedBody: "Vaša rezervácia bola potvrdená.",
    declinedBody: "Túto rezerváciu sa nepodarilo potvrdiť.",
    service: "Služba",
    duration: "Trvanie",
    price: "Cena",
    date: "Dátum",
    time: "Čas",
    timezone: "Časové pásmo",
    support: "Otázky k aplikácii",
    footer:
      "Toto je informačná správa o vašej žiadosti. Na správu nemusíte odpovedať.",
  },
  uk: {
    accepted: "Ваш запис підтверджено",
    declined: "Запис не підтверджено",
    greeting: "Вітаємо!",
    acceptedBody: "Майстер підтвердив ваш запис.",
    declinedBody: "Цей запис не вдалося підтвердити.",
    service: "Послуга",
    duration: "Тривалість",
    price: "Вартість",
    date: "Дата",
    time: "Час",
    timezone: "Часовий пояс",
    support: "Запитання про застосунок",
    footer:
      "Це інформаційне повідомлення щодо вашої заявки. Відповідати на нього не потрібно.",
  },
} as const;

function formatDuration(minutes: number, locale: string): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const format = (amount: number, unit: "hour" | "minute") =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "long",
    }).format(amount);
  return [
    ...(hours ? [format(hours, "hour")] : []),
    ...(remainder || !hours ? [format(remainder, "minute")] : []),
  ].join(" ");
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
    hourCycle: "h23",
    timeZone: input.timezone,
  }).format(new Date(input.startsAt));
  const subject =
    input.decision === "accepted" ? messages.accepted : messages.declined;
  const body =
    input.decision === "accepted"
      ? messages.acceptedBody
      : messages.declinedBody;
  const preheader = `${subject} · ${input.workspaceName}`;
  const details =
    input.decision === "accepted"
      ? [
          { label: messages.service, value: input.serviceName },
          ...(input.durationMinutes === undefined
            ? []
            : [
                {
                  label: messages.duration,
                  value: formatDuration(input.durationMinutes, locale),
                },
              ]),
          ...(input.priceAmount === undefined || !input.currency
            ? []
            : [
                {
                  label: messages.price,
                  value: new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: input.currency,
                  }).format(input.priceAmount),
                },
              ]),
          { label: messages.date, value: date },
          { label: messages.time, value: time },
          { label: messages.timezone, value: input.timezone },
        ]
      : [];
  return {
    subject,
    preheader,
    ...renderEmailLayout({
      htmlLanguage: input.locale === "cz" ? "cs" : input.locale,
      title: subject,
      preheader,
      workspaceName: input.workspaceName,
      paragraphs: [messages.greeting, body],
      details,
      footer: messages.footer,
      ...(input.supportEmail
        ? { support: { label: messages.support, email: input.supportEmail } }
        : {}),
    }),
  };
}
