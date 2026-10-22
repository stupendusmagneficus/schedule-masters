export type LifecycleEvent =
  | "request_received"
  | "master_request_received"
  | "customer_confirmed"
  | "master_customer_confirmed"
  | "cancelled_by_master"
  | "cancelled_by_customer"
  | "master_customer_cancelled";
type Copy = {
  events: Record<LifecycleEvent, readonly [string, string]>;
  footer: string;
  manage: string;
  fallback: string;
  customer: string;
  occurrences: string;
};
export const lifecycleCopy: Record<"en" | "cz" | "sk" | "ru" | "uk", Copy> = {
  en: {
    footer:
      "This is an informational message about an appointment. No reply is needed.",
    events: {
      request_received: [
        "Your booking request was received",
        "Your request is waiting for the professional's decision. This is not a confirmed appointment.",
      ],
      master_request_received: [
        "New booking request",
        "A customer requested an appointment. Open your calendar to accept or decline it.",
      ],
      customer_confirmed: [
        "Your confirmation was received",
        "You confirmed this appointment.",
      ],
      master_customer_confirmed: [
        "Customer confirmed the appointment",
        "The customer confirmed their appointment using the management link.",
      ],
      cancelled_by_master: [
        "Your appointment was cancelled",
        "The professional cancelled the appointment or appointments listed below.",
      ],
      cancelled_by_customer: [
        "Your cancellation was received",
        "You cancelled this appointment.",
      ],
      master_customer_cancelled: [
        "Customer cancelled the appointment",
        "The customer cancelled their appointment using the management link.",
      ],
    },
    manage: "Manage appointment",
    fallback: "If the button does not work, open this link:",
    customer: "Customer",
    occurrences: "Cancelled appointments",
  },
  cz: {
    footer:
      "Toto je informační zpráva o rezervaci. Na zprávu nemusíte odpovídat.",
    events: {
      request_received: [
        "Žádost o rezervaci byla přijata",
        "Vaše žádost čeká na rozhodnutí specialisty. Rezervace zatím není potvrzená.",
      ],
      master_request_received: [
        "Nová žádost o rezervaci",
        "Klient požádal o rezervaci. Přijměte nebo odmítněte ji v kalendáři.",
      ],
      customer_confirmed: [
        "Vaše potvrzení bylo přijato",
        "Potvrdili jste tuto rezervaci.",
      ],
      master_customer_confirmed: [
        "Klient potvrdil rezervaci",
        "Klient potvrdil rezervaci pomocí odkazu pro správu.",
      ],
      cancelled_by_master: [
        "Vaše rezervace byla zrušena",
        "Specialista zrušil rezervaci nebo rezervace uvedené níže.",
      ],
      cancelled_by_customer: [
        "Vaše zrušení bylo přijato",
        "Zrušili jste tuto rezervaci.",
      ],
      master_customer_cancelled: [
        "Klient zrušil rezervaci",
        "Klient zrušil rezervaci pomocí odkazu pro správu.",
      ],
    },
    manage: "Spravovat rezervaci",
    fallback: "Pokud tlačítko nefunguje, otevřete tento odkaz:",
    customer: "Klient",
    occurrences: "Zrušené rezervace",
  },
  sk: {
    footer:
      "Toto je informačná správa o rezervácii. Na správu nemusíte odpovedať.",
    events: {
      request_received: [
        "Žiadosť o rezerváciu bola prijatá",
        "Vaša žiadosť čaká na rozhodnutie špecialistu. Rezervácia zatiaľ nie je potvrdená.",
      ],
      master_request_received: [
        "Nová žiadosť o rezerváciu",
        "Klient požiadal o rezerváciu. Prijmite alebo odmietnite ju v kalendári.",
      ],
      customer_confirmed: [
        "Vaše potvrdenie bolo prijaté",
        "Potvrdili ste túto rezerváciu.",
      ],
      master_customer_confirmed: [
        "Klient potvrdil rezerváciu",
        "Klient potvrdil rezerváciu pomocou odkazu na správu.",
      ],
      cancelled_by_master: [
        "Vaša rezervácia bola zrušená",
        "Špecialista zrušil rezerváciu alebo rezervácie uvedené nižšie.",
      ],
      cancelled_by_customer: [
        "Vaše zrušenie bolo prijaté",
        "Zrušili ste túto rezerváciu.",
      ],
      master_customer_cancelled: [
        "Klient zrušil rezerváciu",
        "Klient zrušil rezerváciu pomocou odkazu na správu.",
      ],
    },
    manage: "Spravovať rezerváciu",
    fallback: "Ak tlačidlo nefunguje, otvorte tento odkaz:",
    customer: "Klient",
    occurrences: "Zrušené rezervácie",
  },
  ru: {
    footer: "Это информационное сообщение о записи. На него не нужно отвечать.",
    events: {
      request_received: [
        "Заявка на запись получена",
        "Ваша заявка ожидает решения мастера. Запись пока не подтверждена.",
      ],
      master_request_received: [
        "Новая заявка на запись",
        "Клиент отправил заявку. Откройте календарь, чтобы подтвердить или отклонить её.",
      ],
      customer_confirmed: [
        "Ваше подтверждение получено",
        "Вы подтвердили эту запись.",
      ],
      master_customer_confirmed: [
        "Клиент подтвердил запись",
        "Клиент подтвердил запись по ссылке управления.",
      ],
      cancelled_by_master: [
        "Ваша запись отменена",
        "Мастер отменил запись или записи, перечисленные ниже.",
      ],
      cancelled_by_customer: [
        "Отмена записи принята",
        "Вы отменили эту запись.",
      ],
      master_customer_cancelled: [
        "Клиент отменил запись",
        "Клиент отменил запись по ссылке управления.",
      ],
    },
    manage: "Управлять записью",
    fallback: "Если кнопка не работает, откройте эту ссылку:",
    customer: "Клиент",
    occurrences: "Отменённые записи",
  },
  uk: {
    footer:
      "Це інформаційне повідомлення щодо запису. Відповідати на нього не потрібно.",
    events: {
      request_received: [
        "Заявку на запис отримано",
        "Ваша заявка очікує на рішення майстра. Запис ще не підтверджено.",
      ],
      master_request_received: [
        "Нова заявка на запис",
        "Клієнт надіслав заявку. Відкрийте календар, щоб підтвердити або відхилити її.",
      ],
      customer_confirmed: [
        "Ваше підтвердження отримано",
        "Ви підтвердили цей запис.",
      ],
      master_customer_confirmed: [
        "Клієнт підтвердив запис",
        "Клієнт підтвердив запис за посиланням керування.",
      ],
      cancelled_by_master: [
        "Ваш запис скасовано",
        "Майстер скасував запис або записи, перелічені нижче.",
      ],
      cancelled_by_customer: [
        "Скасування запису прийнято",
        "Ви скасували цей запис.",
      ],
      master_customer_cancelled: [
        "Клієнт скасував запис",
        "Клієнт скасував запис за посиланням керування.",
      ],
    },
    manage: "Керувати записом",
    fallback: "Якщо кнопка не працює, відкрийте це посилання:",
    customer: "Клієнт",
    occurrences: "Скасовані записи",
  },
};
