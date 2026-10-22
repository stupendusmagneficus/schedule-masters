import { renderEmailLayout } from "./emailLayout.ts";

export const emailLocales = ["en", "cz", "sk", "ru", "uk"] as const;
export type EmailLocale = (typeof emailLocales)[number];
type Copy = {
  title: string;
  preheader: string;
  intro: string;
  action: string;
  fallback: string;
  footer: string;
};
export type AuthEmailCatalog = Record<EmailLocale, Copy>;

function getFields(copy: AuthEmailCatalog, locale: EmailLocale) {
  return { ...copy[locale], htmlLanguage: locale === "cz" ? "cs" : locale };
}
function render(fields: Copy & { htmlLanguage: string }, url: string) {
  return renderEmailLayout({
    htmlLanguage: fields.htmlLanguage,
    title: fields.title,
    preheader: fields.preheader,
    paragraphs: [fields.intro],
    footer: fields.footer,
    action: { label: fields.action, url, fallbackLabel: fields.fallback },
  });
}
export function createAuthEmail(
  copy: AuthEmailCatalog,
  locale: unknown,
  url: string,
) {
  const fields = getFields(
    copy,
    emailLocales.includes(locale as EmailLocale)
      ? (locale as EmailLocale)
      : "en",
  );
  return {
    subject: `Schedule Masters — ${fields.title}`,
    preheader: fields.preheader,
    ...render(fields, url),
  };
}

// Metadata selects static catalog values only; never interpolate it into HTML.
export function buildAuthEmailTemplate(copy: AuthEmailCatalog) {
  const defaults = getFields(copy, "en");
  const assignments = (locale: EmailLocale, operator: ":=" | "=") =>
    Object.entries(getFields(copy, locale))
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
  ) as typeof defaults;
  const { html } = render(placeholders, "{{ .ConfirmationURL }}");
  const subject = [
    ...branches.map(
      (locale, index) =>
        `{{ ${index ? "else if" : "if"} eq (printf "%v" .Data.locale) "${locale}" }}Schedule Masters — ${copy[locale].title}`,
    ),
    `{{ else }}Schedule Masters — ${copy.en.title}{{ end }}`,
  ].join("");
  return { html: `${prelude}\n${html}\n`, subject };
}
