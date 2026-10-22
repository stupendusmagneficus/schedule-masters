// Email adapter for docs/design/design-tokens.json. Inline CSS is intentional:
// mail clients cannot depend on the app stylesheet, scripts, fonts or images.
const theme = {
  action: "#2F7D5C",
  canvas: "#F7F8F7",
  surface: "#FFFFFF",
  border: "#D8DEDA",
  text: "#202522",
  secondary: "#68716C",
} as const;

type EmailLayout = {
  readonly htmlLanguage: string;
  readonly title: string;
  readonly preheader: string;
  readonly paragraphs: readonly string[];
  readonly footer: string;
  readonly workspaceName?: string;
  readonly details?: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly action?: {
    readonly label: string;
    readonly url: string;
    readonly fallbackLabel: string;
  };
  readonly support?: { readonly label: string; readonly email: string };
};

function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function renderEmailLayout(input: EmailLayout) {
  const htmlEscape = escapeEmailHtml;
  const details = input.details ?? [];
  const html = `<!doctype html>
<html lang="${htmlEscape(input.htmlLanguage)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${htmlEscape(input.title)}</title>
  </head>
  <body style="margin:0;background:${theme.canvas};color:${theme.text};font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${htmlEscape(input.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${theme.canvas};">
      <tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;table-layout:fixed;background:${theme.surface};border:1px solid ${theme.border};border-radius:16px;">
          <tr><td style="padding:24px;border-bottom:1px solid ${theme.border};overflow-wrap:break-word;word-wrap:break-word;">
            <p style="margin:0;color:${theme.action};font-size:12px;font-weight:700;letter-spacing:1px;">SCHEDULE MASTERS</p>
            ${input.workspaceName ? `<p style="margin:12px 0 0;font-size:20px;line-height:1.4;font-weight:700;">${htmlEscape(input.workspaceName)}</p>` : ""}
          </td></tr>
          <tr><td style="padding:24px;overflow-wrap:break-word;word-wrap:break-word;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;">${htmlEscape(input.title)}</h1>
            ${input.paragraphs.map((paragraph) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${htmlEscape(paragraph)}</p>`).join("")}
            ${details.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;">${details.map((detail) => `<tr><td style="padding:12px 0;border-top:1px solid ${theme.border};overflow-wrap:break-word;word-wrap:break-word;"><p style="margin:0 0 4px;color:${theme.secondary};font-size:14px;line-height:1.5;">${htmlEscape(detail.label)}</p><p style="margin:0;font-size:16px;line-height:1.5;font-weight:700;">${htmlEscape(detail.value)}</p></td></tr>`).join("")}</table>` : ""}
            ${input.action ? `<p style="margin:24px 0;"><a href="${htmlEscape(input.action.url)}" style="display:inline-block;padding:12px 24px;background:${theme.action};border-radius:999px;color:${theme.surface};font-size:16px;line-height:24px;font-weight:700;text-decoration:none;">${htmlEscape(input.action.label)}</a></p><p style="margin:0;color:${theme.secondary};font-size:14px;line-height:1.5;">${htmlEscape(input.action.fallbackLabel)}</p><p style="margin:8px 0 0;font-size:14px;line-height:1.5;word-break:break-all;"><a href="${htmlEscape(input.action.url)}" style="color:${theme.action};">${htmlEscape(input.action.url)}</a></p>` : ""}
          </td></tr>
          <tr><td style="padding:20px 24px;border-top:1px solid ${theme.border};overflow-wrap:break-word;word-wrap:break-word;">
            <p style="margin:0;color:${theme.secondary};font-size:14px;line-height:1.5;">${htmlEscape(input.footer)}</p>
            ${input.support ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.5;">${htmlEscape(input.support.label)}: <a href="mailto:${htmlEscape(input.support.email)}" style="color:${theme.action};word-break:break-all;">${htmlEscape(input.support.email)}</a></p>` : ""}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  const text = [
    "Schedule Masters",
    ...(input.workspaceName ? [input.workspaceName] : []),
    "",
    input.title,
    "",
    ...input.paragraphs,
    ...(details.length
      ? ["", ...details.map(({ label, value }) => `${label}: ${value}`)]
      : []),
    ...(input.action ? ["", `${input.action.label}: ${input.action.url}`] : []),
    "",
    input.footer,
    ...(input.support
      ? [`${input.support.label}: ${input.support.email}`]
      : []),
  ].join("\n");
  return { html, text };
}
