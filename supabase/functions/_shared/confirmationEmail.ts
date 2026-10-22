import {
  buildAuthEmailTemplate,
  createAuthEmail,
} from "./authEmailTemplate.ts";

export { emailLocales } from "./authEmailTemplate.ts";

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

export function createConfirmationEmail(
  locale: unknown,
  confirmationUrl: string,
) {
  return createAuthEmail(copy, locale, confirmationUrl);
}
export function buildConfirmationTemplate() {
  return buildAuthEmailTemplate(copy);
}
