import { renderEmailLayout } from "./emailLayout.ts";

const copy = {
  en: {
    title: "Confirm your email",
    preheader:
      "Confirm your email address to finish creating your Schedule Masters account.",
    intro: "Finish creating your account by confirming your email address.",
    action: "Confirm email",
    fallback: "If the button does not work, open this link:",
    footer: "If you did not create an account, you can ignore this email.",
  },
  cz: {
    title: "Potvrďte svůj e-mail",
    preheader:
      "Potvrďte e-mailovou adresu a dokončete registraci do Schedule Masters.",
    intro: "Dokončete registraci potvrzením své e-mailové adresy.",
    action: "Potvrdit e-mail",
    fallback: "Pokud tlačítko nefunguje, otevřete tento odkaz:",
    footer: "Pokud jste účet nevytvářeli, můžete tento e-mail ignorovat.",
  },
  sk: {
    title: "Potvrďte svoj e-mail",
    preheader:
      "Potvrďte e-mailovú adresu a dokončite registráciu do Schedule Masters.",
    intro: "Dokončite registráciu potvrdením svojej e-mailovej adresy.",
    action: "Potvrdiť e-mail",
    fallback: "Ak tlačidlo nefunguje, otvorte tento odkaz:",
    footer: "Ak ste účet nevytvárali, môžete tento e-mail ignorovať.",
  },
  ru: {
    title: "Подтвердите email",
    preheader:
      "Подтвердите адрес электронной почты, чтобы завершить регистрацию в Schedule Masters.",
    intro:
      "Подтвердите адрес электронной почты, чтобы завершить создание аккаунта.",
    action: "Подтвердить email",
    fallback: "Если кнопка не работает, откройте эту ссылку:",
    footer: "Если вы не создавали аккаунт, проигнорируйте это письмо.",
  },
  uk: {
    title: "Підтвердьте email",
    preheader:
      "Підтвердьте адресу електронної пошти, щоб завершити реєстрацію в Schedule Masters.",
    intro:
      "Підтвердьте адресу електронної пошти, щоб завершити створення облікового запису.",
    action: "Підтвердити email",
    fallback: "Якщо кнопка не працює, відкрийте це посилання:",
    footer: "Якщо ви не створювали обліковий запис, проігноруйте цей лист.",
  },
} as const;

export const emailLocales = ["en", "cz", "sk", "ru", "uk"] as const;
type EmailLocale = (typeof emailLocales)[number];

function getFields(locale: EmailLocale) {
  return { ...copy[locale], htmlLanguage: locale === "cz" ? "cs" : locale };
}

export function createConfirmationEmail(
  locale: unknown,
  confirmationUrl: string,
) {
  if (!emailLocales.includes(locale as EmailLocale)) locale = "en";
  const fields = getFields(locale as EmailLocale);
  return {
    subject: `Schedule Masters — ${fields.title}`,
    preheader: fields.preheader,
    ...renderConfirmationLayout(fields, confirmationUrl),
  };
}

function renderConfirmationLayout(
  fields: Record<keyof ReturnType<typeof getFields>, string>,
  confirmationUrl: string,
) {
  return renderEmailLayout({
    htmlLanguage: fields.htmlLanguage,
    title: fields.title,
    preheader: fields.preheader,
    paragraphs: [fields.intro],
    footer: fields.footer,
    action: {
      label: fields.action,
      url: confirmationUrl,
      fallbackLabel: fields.fallback,
    },
  });
}

// Supabase Auth renders Go templates with user_metadata in .Data. All output
// strings and language codes below come from our catalog, never from metadata.
export function buildConfirmationTemplate() {
  const defaults = getFields("en");
  const assignments = (locale: EmailLocale, operator: ":=" | "=") =>
    Object.entries(getFields(locale))
      .map(
        ([key, value]) => `{{ $${key} ${operator} ${JSON.stringify(value)} }}`,
      )
      .join("\n");
  const branches = emailLocales.filter((locale) => locale !== "en");
  const prelude = [
    assignments("en", ":="),
    ...branches.map(
      (locale, index) =>
        `{{ ${index ? "else if" : "if"} eq (printf "%v" .Data.locale) "${locale}" }}\n${assignments(locale, "=")}`,
    ),
    "{{ end }}",
  ].join("\n");
  const placeholders = Object.fromEntries(
    Object.keys(defaults).map((key) => [key, `{{ $${key} }}`]),
  ) as Record<keyof typeof defaults, string>;
  const { html } = renderConfirmationLayout(
    placeholders,
    "{{ .ConfirmationURL }}",
  );
  const subject = [
    ...branches.map(
      (locale, index) =>
        `{{ ${index ? "else if" : "if"} eq (printf "%v" .Data.locale) "${locale}" }}Schedule Masters — ${copy[locale].title}`,
    ),
    `{{ else }}Schedule Masters — ${copy.en.title}{{ end }}`,
  ].join("");
  return { html: `${prelude}\n${html}\n`, subject };
}
