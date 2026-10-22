import {
  type AuthEmailCatalog,
  buildAuthEmailTemplate,
  createAuthEmail,
} from "./authEmailTemplate.ts";

const copy: AuthEmailCatalog = {
  en: {
    title: "Reset your password",
    preheader: "Restore access to your Schedule Masters account.",
    intro:
      "Use this link to set a new password. Open it on the device and browser where you requested the reset.",
    action: "Set a new password",
    fallback: "If the button does not work, open this link:",
    footer:
      "If you did not request a password reset, ignore this email. Your password has not changed.",
  },
  cz: {
    title: "Obnovit heslo",
    preheader: "Obnovte přístup ke svému účtu Schedule Masters.",
    intro:
      "Pomocí odkazu si nastavte nové heslo. Otevřete jej na zařízení a v prohlížeči, kde jste o obnovu požádali.",
    action: "Nastavit nové heslo",
    fallback: "Pokud tlačítko nefunguje, otevřete tento odkaz:",
    footer:
      "Pokud jste o obnovu hesla nežádali, tento e-mail ignorujte. Vaše heslo se nezměnilo.",
  },
  sk: {
    title: "Obnoviť heslo",
    preheader: "Obnovte prístup k svojmu účtu Schedule Masters.",
    intro:
      "Pomocou odkazu si nastavte nové heslo. Otvorte ho na zariadení a v prehliadači, kde ste o obnovu požiadali.",
    action: "Nastaviť nové heslo",
    fallback: "Ak tlačidlo nefunguje, otvorte tento odkaz:",
    footer:
      "Ak ste o obnovu hesla nežiadali, tento e-mail ignorujte. Vaše heslo sa nezmenilo.",
  },
  ru: {
    title: "Восстановление пароля",
    preheader: "Восстановите доступ к аккаунту Schedule Masters.",
    intro:
      "Перейдите по ссылке, чтобы задать новый пароль. Откройте её на том же устройстве и в том же браузере, где запросили восстановление.",
    action: "Задать новый пароль",
    fallback: "Если кнопка не работает, откройте эту ссылку:",
    footer:
      "Если вы не запрашивали восстановление, проигнорируйте письмо. Ваш пароль не изменён.",
  },
  uk: {
    title: "Відновлення пароля",
    preheader: "Відновіть доступ до облікового запису Schedule Masters.",
    intro:
      "Перейдіть за посиланням, щоб задати новий пароль. Відкрийте його на тому самому пристрої та в тому самому браузері, де запитали відновлення.",
    action: "Задати новий пароль",
    fallback: "Якщо кнопка не працює, відкрийте це посилання:",
    footer:
      "Якщо ви не запитували відновлення, проігноруйте лист. Ваш пароль не змінено.",
  },
};
export function createRecoveryEmail(locale: unknown, url: string) {
  return createAuthEmail(copy, locale, url);
}
export function buildRecoveryTemplate() {
  return buildAuthEmailTemplate(copy);
}
