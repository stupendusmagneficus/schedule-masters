export const supportedLocales = ["ru", "cz", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const fallbackLocale: SupportedLocale = "en";
export const defaultLocale: SupportedLocale = "cz";

const intlLocales: Record<SupportedLocale, string> = {
  ru: "ru-RU",
  cz: "cs-CZ",
  en: "en-US",
};

export type MessageKey =
  | "common.appName"
  | "common.language"
  | "common.save"
  | "common.cancel"
  | "common.retry"
  | "common.loading"
  | "common.error"
  | "auth.emailLabel"
  | "auth.passwordLabel"
  | "auth.passwordHint"
  | "auth.requiredHint"
  | "auth.showPassword"
  | "auth.hidePassword"
  | "auth.signIn"
  | "auth.signInTitle"
  | "auth.signInPrompt"
  | "auth.signUp"
  | "auth.signUpTitle"
  | "auth.signUpPrompt"
  | "auth.emailInvalid"
  | "auth.passwordTooShort"
  | "auth.invalidCredentials"
  | "auth.accountExists"
  | "auth.networkError"
  | "auth.sessionRestoreFailed"
  | "auth.signOutFailed"
  | "auth.confirmationRequired"
  | "workspace.loadFailedTitle"
  | "workspace.loadFailedDescription"
  | "workspace.setupEyebrow"
  | "workspace.setupTitle"
  | "workspace.setupDescription"
  | "workspace.namePlaceholder"
  | "workspace.slugPlaceholder"
  | "workspace.servicePlaceholder"
  | "workspace.pricePlaceholder"
  | "workspace.durationPlaceholder"
  | "workspace.startTimeLabel"
  | "workspace.endTimeLabel"
  | "workspace.workingDaysLabel"
  | "workspace.dayMonday"
  | "workspace.dayTuesday"
  | "workspace.dayWednesday"
  | "workspace.dayThursday"
  | "workspace.dayFriday"
  | "workspace.daySaturday"
  | "workspace.daySunday"
  | "workspace.setupRequiredFields"
  | "workspace.setupFailed"
  | "workspace.setupInvalidSlug"
  | "workspace.setupInvalidService"
  | "workspace.priceInvalid"
  | "workspace.durationInvalid"
  | "workspace.workingDaysInvalid"
  | "workspace.scheduleInvalid"
  | "workspace.setupSaving"
  | "workspace.setupSave"
  | "workspace.setupStepMaster"
  | "workspace.setupStepMasterDescription"
  | "workspace.setupStepService"
  | "workspace.setupStepServiceDescription"
  | "workspace.setupStepSchedule"
  | "workspace.setupStepScheduleDescription"
  | "workspace.setupCompleteTitle"
  | "workspace.setupCompleteDescription"
  | "workspace.setupOpenDashboard"
  | "workspace.setupOpenBooking"
  | "workspace.setupNext"
  | "workspace.setupBack"
  | "workspace.setupFinish"
  | "mobile.description"
  | "mobile.demoMode"
  | "mobile.todaySchedule"
  | "mobile.freeSlots"
  | "mobile.available"
  | "mobile.pending"
  | "mobile.confirmed"
  | "mobile.today"
  | "mobile.calendar"
  | "mobile.profile"
  | "mobile.newBooking"
  | "mobile.newBookingNoticeTitle"
  | "mobile.newBookingNoticeDescription"
  | "mobile.newBookingNoticeClose"
  | "mobile.bookings"
  | "mobile.expectedRevenue"
  | "mobile.nextBooking"
  | "mobile.noBookingsToday"
  | "mobile.firstService"
  | "mobile.noServices"
  | "mobile.workingHours"
  | "mobile.publicBookingLink"
  | "mobile.publicBookingDescription"
  | "mobile.personalBlocks"
  | "mobile.personalBlockEmpty"
  | "mobile.personalBlockTitle"
  | "mobile.personalBlockDescription"
  | "mobile.personalBlockDate"
  | "mobile.personalBlockDatePlaceholder"
  | "mobile.personalBlockDateInvalid"
  | "mobile.personalBlockStart"
  | "mobile.personalBlockEnd"
  | "mobile.personalBlockTimePlaceholder"
  | "mobile.personalBlockTimeInvalid"
  | "mobile.personalBlockEndBeforeStart"
  | "mobile.personalBlockReason"
  | "mobile.personalBlockReasonPlaceholder"
  | "mobile.personalBlockCreate"
  | "mobile.personalBlockAdd"
  | "mobile.personalBlockDelete"
  | "mobile.personalBlockOverlap"
  | "mobile.signOut"
  | "booking.description"
  | "booking.chooseService"
  | "booking.chooseDate"
  | "booking.chooseTime"
  | "booking.yourDetails"
  | "booking.name"
  | "booking.email"
  | "booking.phone"
  | "booking.note"
  | "booking.confirm"
  | "booking.confirmed"
  | "booking.close"
  | "booking.noSlots"
  | "booking.selectService"
  | "booking.selectTime"
  | "booking.required"
  | "booking.loadingSlots"
  | "booking.nameRequired"
  | "booking.chooseAnotherDate"
  | "booking.availableTimesForDate"
  | "booking.noSlotsForDate"
  | "booking.requiredHint"
  | "booking.optional";

type Messages = Record<MessageKey, string>;

const messages: Record<SupportedLocale, Messages> = {
  ru: {
    "common.appName": "Schedule Masters",
    "common.language": "Язык",
    "common.save": "Сохранить",
    "common.cancel": "Отмена",
    "common.retry": "Повторить",
    "common.loading": "Загрузка…",
    "common.error":
      "Не удалось завершить действие. Повторите попытку через несколько секунд.",
    "auth.emailLabel": "Email",
    "auth.passwordLabel": "Пароль",
    "auth.passwordHint": "Не менее 8 символов",
    "auth.requiredHint": "Поля со знаком * обязательны.",
    "auth.showPassword": "Показать пароль",
    "auth.hidePassword": "Скрыть пароль",
    "auth.signIn": "Войти",
    "auth.signInTitle": "С возвращением",
    "auth.signInPrompt": "Уже есть аккаунт? Войти",
    "auth.signUp": "Создать аккаунт",
    "auth.signUpTitle": "Создайте аккаунт мастера",
    "auth.signUpPrompt": "Нет аккаунта? Зарегистрироваться",
    "auth.emailInvalid": "Введите корректный email.",
    "auth.passwordTooShort": "Пароль должен содержать не менее 8 символов.",
    "auth.invalidCredentials":
      "Не удалось войти. Проверьте email и пароль, затем попробуйте ещё раз.",
    "auth.accountExists": "Этот email уже зарегистрирован. Попробуйте войти.",
    "auth.networkError":
      "Не удалось подключиться. Проверьте интернет и повторите попытку.",
    "auth.sessionRestoreFailed":
      "Не удалось восстановить сессию. Войдите ещё раз.",
    "auth.signOutFailed": "Не удалось выйти из аккаунта. Повторите попытку.",
    "auth.confirmationRequired":
      "Проверьте email и подтвердите аккаунт, затем войдите.",
    "workspace.loadFailedTitle": "Не удалось загрузить рабочее пространство",
    "workspace.loadFailedDescription":
      "Проверьте подключение к интернету и повторите попытку.",
    "workspace.setupEyebrow": "ПЕРВОНАЧАЛЬНАЯ НАСТРОЙКА",
    "workspace.setupTitle": "Настройте рабочее пространство",
    "workspace.setupDescription":
      "Укажите данные, первую услугу и базовое расписание. Позже настройки можно изменить.",
    "workspace.namePlaceholder": "Название рабочего пространства",
    "workspace.slugPlaceholder": "Ссылка на запись, например anna-nails",
    "workspace.servicePlaceholder": "Первая услуга",
    "workspace.pricePlaceholder": "Цена в Kč",
    "workspace.durationPlaceholder": "Длительность, минут",
    "workspace.startTimeLabel": "Начало рабочего дня",
    "workspace.endTimeLabel": "Конец рабочего дня",
    "workspace.workingDaysLabel": "Рабочие дни",
    "workspace.dayMonday": "Пн",
    "workspace.dayTuesday": "Вт",
    "workspace.dayWednesday": "Ср",
    "workspace.dayThursday": "Чт",
    "workspace.dayFriday": "Пт",
    "workspace.daySaturday": "Сб",
    "workspace.daySunday": "Вс",
    "workspace.setupRequiredFields":
      "Заполните название, ссылку на запись и услугу.",
    "workspace.setupFailed":
      "Не удалось сохранить настройки. Проверьте данные и повторите попытку.",
    "workspace.setupInvalidSlug":
      "Ссылка должна содержать только латинские буквы, цифры и дефисы.",
    "workspace.setupInvalidService": "Проверьте название услуги и цену.",
    "workspace.priceInvalid": "Введите корректную цену не меньше 0 Kč.",
    "workspace.durationInvalid":
      "Введите целую длительность услуги от 1 до 1440 минут.",
    "workspace.workingDaysInvalid": "Выберите хотя бы один рабочий день.",
    "workspace.scheduleInvalid":
      "Введите время в формате ЧЧ:ММ. Конец дня должен быть позже начала.",
    "workspace.setupSaving": "Сохранение…",
    "workspace.setupSave": "Сохранить и продолжить",
    "workspace.setupStepMaster": "Информация о мастере",
    "workspace.setupStepMasterDescription":
      "Настройте имя рабочего пространства и ссылку, по которой клиенты будут записываться.",
    "workspace.setupStepService": "Первая услуга",
    "workspace.setupStepServiceDescription":
      "Добавьте услугу, которую клиенты смогут выбрать при записи.",
    "workspace.setupStepSchedule": "Рабочие дни и часы",
    "workspace.setupStepScheduleDescription":
      "Выберите дни и общий интервал, когда вы принимаете клиентов.",
    "workspace.setupCompleteTitle": "Всё готово",
    "workspace.setupCompleteDescription":
      "Рабочее пространство, первая услуга и расписание созданы. Можно начинать работу.",
    "workspace.setupOpenDashboard": "Открыть Dashboard",
    "workspace.setupOpenBooking": "Открыть страницу записи",
    "workspace.setupNext": "Продолжить",
    "workspace.setupBack": "Назад",
    "workspace.setupFinish": "Перейти к Dashboard",
    "mobile.description": "Мобильное приложение мастера готово к работе.",
    "mobile.demoMode": "Демо-режим",
    "mobile.todaySchedule": "Расписание на сегодня",
    "mobile.freeSlots": "Свободные окна",
    "mobile.available": "Свободно",
    "mobile.pending": "Ожидает подтверждения",
    "mobile.confirmed": "Подтверждено",
    "mobile.today": "Сегодня",
    "mobile.calendar": "Календарь",
    "mobile.profile": "Профиль",
    "mobile.newBooking": "Новая запись",
    "mobile.newBookingNoticeTitle": "Новая запись",
    "mobile.newBookingNoticeDescription":
      "Форма создания записи появится в следующем шаге MVP.",
    "mobile.newBookingNoticeClose": "Закрыть",
    "mobile.bookings": "Записи",
    "mobile.expectedRevenue": "Ожидаемая выручка",
    "mobile.nextBooking": "Следующая запись",
    "mobile.noBookingsToday": "На сегодня записей нет.",
    "mobile.firstService": "Первая услуга",
    "mobile.noServices": "Активных услуг пока нет.",
    "mobile.workingHours": "Рабочие часы",
    "mobile.publicBookingLink": "Публичная ссылка на запись",
    "mobile.publicBookingDescription":
      "Клиенты могут выбрать услугу и свободное время.",
    "mobile.personalBlocks": "Личные блоки",
    "mobile.personalBlockEmpty": "Личных блоков на ближайшие дни нет.",
    "mobile.personalBlockTitle": "Закрыть время",
    "mobile.personalBlockDescription":
      "Добавьте перерыв или личное дело. Это время исчезнет из доступных окон.",
    "mobile.personalBlockDate": "Дата",
    "mobile.personalBlockDatePlaceholder": "ГГГГ-ММ-ДД",
    "mobile.personalBlockDateInvalid": "Укажите дату в формате ГГГГ-ММ-ДД.",
    "mobile.personalBlockStart": "Начало",
    "mobile.personalBlockEnd": "Конец",
    "mobile.personalBlockTimePlaceholder": "ЧЧ:ММ",
    "mobile.personalBlockTimeInvalid": "Укажите время в формате ЧЧ:ММ.",
    "mobile.personalBlockEndBeforeStart":
      "Время окончания должно быть позже начала.",
    "mobile.personalBlockReason": "Название или причина",
    "mobile.personalBlockReasonPlaceholder": "Например, обед",
    "mobile.personalBlockCreate": "Закрыть время",
    "mobile.personalBlockAdd": "Добавить перерыв",
    "mobile.personalBlockDelete": "Удалить",
    "mobile.personalBlockOverlap":
      "Это время пересекается с существующей записью или блоком.",
    "mobile.signOut": "Выйти",
    "booking.description": "Страница онлайн-записи готова к работе.",
    "booking.chooseService": "Выберите услугу",
    "booking.chooseDate": "Выберите дату",
    "booking.chooseTime": "Выберите время",
    "booking.yourDetails": "Ваши данные",
    "booking.name": "Имя",
    "booking.email": "Email",
    "booking.phone": "Телефон",
    "booking.note": "Комментарий",
    "booking.confirm": "Подтвердить запись",
    "booking.confirmed": "Запись подтверждена",
    "booking.close": "Закрыть",
    "booking.noSlots": "На эту дату нет свободного времени.",
    "booking.selectService": "Выберите услугу, чтобы увидеть свободное время.",
    "booking.selectTime": "Выберите свободное время.",
    "booking.required": "Заполните обязательные поля.",
    "booking.loadingSlots": "Проверяем свободное время…",
    "booking.nameRequired": "Укажите ваше имя.",
    "booking.chooseAnotherDate": "Проверить следующий рабочий день",
    "booking.availableTimesForDate": "Свободное время на {date}",
    "booking.noSlotsForDate": "На {date} свободного времени нет.",
    "booking.requiredHint":
      "Поля со знаком * обязательны. Email и телефон можно не заполнять.",
    "booking.optional": "необязательно",
  },
  cz: {
    "common.appName": "Schedule Masters",
    "common.language": "Jazyk",
    "common.save": "Uložit",
    "common.cancel": "Zrušit",
    "common.retry": "Zkusit znovu",
    "common.loading": "Načítání…",
    "common.error":
      "Akci se nepodařilo dokončit. Zkuste to prosím znovu za chvíli.",
    "auth.emailLabel": "E-mail",
    "auth.passwordLabel": "Heslo",
    "auth.passwordHint": "Alespoň 8 znaků",
    "auth.requiredHint": "Pole označená * jsou povinná.",
    "auth.showPassword": "Zobrazit heslo",
    "auth.hidePassword": "Skrýt heslo",
    "auth.signIn": "Přihlásit se",
    "auth.signInTitle": "Vítejte zpět",
    "auth.signInPrompt": "Už máte účet? Přihlaste se",
    "auth.signUp": "Vytvořit účet",
    "auth.signUpTitle": "Vytvořte si účet mistra",
    "auth.signUpPrompt": "Nemáte účet? Zaregistrujte se",
    "auth.emailInvalid": "Zadejte platný e-mail.",
    "auth.passwordTooShort": "Heslo musí mít alespoň 8 znaků.",
    "auth.invalidCredentials":
      "Přihlášení se nepodařilo. Zkontrolujte e-mail a heslo a zkuste to znovu.",
    "auth.accountExists":
      "Tento e-mail už je zaregistrovaný. Zkuste se přihlásit.",
    "auth.networkError":
      "Nepodařilo se připojit. Zkontrolujte internet a zkuste to znovu.",
    "auth.sessionRestoreFailed":
      "Relaci se nepodařilo obnovit. Přihlaste se znovu.",
    "auth.signOutFailed": "Z účtu se nepodařilo odhlásit. Zkuste to znovu.",
    "auth.confirmationRequired":
      "Zkontrolujte e-mail, potvrďte účet a poté se přihlaste.",
    "workspace.loadFailedTitle": "Pracovní prostor se nepodařilo načíst",
    "workspace.loadFailedDescription":
      "Zkontrolujte připojení k internetu a zkuste to znovu.",
    "workspace.setupEyebrow": "PRVNÍ NASTAVENÍ",
    "workspace.setupTitle": "Nastavte si pracovní prostor",
    "workspace.setupDescription":
      "Zadejte údaje, první službu a základní pracovní dobu. Nastavení můžete později upravit.",
    "workspace.namePlaceholder": "Název pracovního prostoru",
    "workspace.slugPlaceholder": "Odkaz pro rezervace, například anna-nails",
    "workspace.servicePlaceholder": "První služba",
    "workspace.pricePlaceholder": "Cena v Kč",
    "workspace.durationPlaceholder": "Délka, minuty",
    "workspace.startTimeLabel": "Začátek pracovní doby",
    "workspace.endTimeLabel": "Konec pracovní doby",
    "workspace.workingDaysLabel": "Pracovní dny",
    "workspace.dayMonday": "Po",
    "workspace.dayTuesday": "Út",
    "workspace.dayWednesday": "St",
    "workspace.dayThursday": "Čt",
    "workspace.dayFriday": "Pá",
    "workspace.daySaturday": "So",
    "workspace.daySunday": "Ne",
    "workspace.setupRequiredFields":
      "Vyplňte název, odkaz pro rezervace a službu.",
    "workspace.setupFailed":
      "Nastavení se nepodařilo uložit. Zkontrolujte údaje a zkuste to znovu.",
    "workspace.setupInvalidSlug":
      "Odkaz může obsahovat pouze malá písmena bez diakritiky, číslice a pomlčky.",
    "workspace.setupInvalidService": "Zkontrolujte název služby a cenu.",
    "workspace.priceInvalid": "Zadejte platnou cenu od 0 Kč výše.",
    "workspace.durationInvalid": "Zadejte celé číslo od 1 do 1440 minut.",
    "workspace.workingDaysInvalid": "Vyberte alespoň jeden pracovní den.",
    "workspace.scheduleInvalid":
      "Zadejte čas ve formátu HH:MM. Konec musí být později než začátek.",
    "workspace.setupSaving": "Ukládání…",
    "workspace.setupSave": "Uložit a pokračovat",
    "workspace.setupStepMaster": "Informace o mistrovi",
    "workspace.setupStepMasterDescription":
      "Nastavte název pracovního prostoru a odkaz, přes který se klienti objednají.",
    "workspace.setupStepService": "První služba",
    "workspace.setupStepServiceDescription":
      "Přidejte službu, kterou si klienti vyberou při rezervaci.",
    "workspace.setupStepSchedule": "Pracovní dny a hodiny",
    "workspace.setupStepScheduleDescription":
      "Vyberte dny a časový interval, kdy přijímáte klienty.",
    "workspace.setupCompleteTitle": "Vše je připraveno",
    "workspace.setupCompleteDescription":
      "Pracovní prostor, první služba a rozvrh byly vytvořeny. Můžete začít pracovat.",
    "workspace.setupOpenDashboard": "Otevřít Dashboard",
    "workspace.setupOpenBooking": "Otevřít rezervační stránku",
    "workspace.setupNext": "Pokračovat",
    "workspace.setupBack": "Zpět",
    "workspace.setupFinish": "Přejít na Dashboard",
    "mobile.description": "Mobilní aplikace pro mistra je připravena.",
    "mobile.demoMode": "Demo režim",
    "mobile.todaySchedule": "Dnešní rozvrh",
    "mobile.freeSlots": "Volné termíny",
    "mobile.available": "Volno",
    "mobile.pending": "Čeká na potvrzení",
    "mobile.confirmed": "Potvrzeno",
    "mobile.today": "Dnes",
    "mobile.calendar": "Kalendář",
    "mobile.profile": "Profil",
    "mobile.newBooking": "Nová rezervace",
    "mobile.newBookingNoticeTitle": "Nová rezervace",
    "mobile.newBookingNoticeDescription":
      "Formulář pro vytvoření rezervace bude přidán v dalším kroku MVP.",
    "mobile.newBookingNoticeClose": "Zavřít",
    "mobile.bookings": "Rezervace",
    "mobile.expectedRevenue": "Očekávané tržby",
    "mobile.nextBooking": "Další rezervace",
    "mobile.noBookingsToday": "Na dnešek nemáte žádné rezervace.",
    "mobile.firstService": "První služba",
    "mobile.noServices": "Zatím nemáte žádné aktivní služby.",
    "mobile.workingHours": "Pracovní doba",
    "mobile.publicBookingLink": "Veřejný odkaz pro rezervace",
    "mobile.publicBookingDescription":
      "Klienti si mohou vybrat službu a volný termín.",
    "mobile.personalBlocks": "Osobní bloky",
    "mobile.personalBlockEmpty": "Na nejbližší dny nemáte žádné osobní bloky.",
    "mobile.personalBlockTitle": "Uzavřít čas",
    "mobile.personalBlockDescription":
      "Přidejte pauzu nebo osobní záležitost. Čas zmizí z volných termínů.",
    "mobile.personalBlockDate": "Datum",
    "mobile.personalBlockDatePlaceholder": "RRRR-MM-DD",
    "mobile.personalBlockDateInvalid": "Zadejte datum ve formátu RRRR-MM-DD.",
    "mobile.personalBlockStart": "Začátek",
    "mobile.personalBlockEnd": "Konec",
    "mobile.personalBlockTimePlaceholder": "HH:MM",
    "mobile.personalBlockTimeInvalid": "Zadejte čas ve formátu HH:MM.",
    "mobile.personalBlockEndBeforeStart": "Konec musí být později než začátek.",
    "mobile.personalBlockReason": "Název nebo důvod",
    "mobile.personalBlockReasonPlaceholder": "Například oběd",
    "mobile.personalBlockCreate": "Uzavřít čas",
    "mobile.personalBlockAdd": "Přidat pauzu",
    "mobile.personalBlockDelete": "Smazat",
    "mobile.personalBlockOverlap":
      "Čas se překrývá s existující rezervací nebo blokem.",
    "mobile.signOut": "Odhlásit se",
    "booking.description": "Stránka online rezervací je připravena.",
    "booking.chooseService": "Vyberte službu",
    "booking.chooseDate": "Vyberte datum",
    "booking.chooseTime": "Vyberte čas",
    "booking.yourDetails": "Vaše údaje",
    "booking.name": "Jméno",
    "booking.email": "E-mail",
    "booking.phone": "Telefon",
    "booking.note": "Poznámka",
    "booking.confirm": "Potvrdit rezervaci",
    "booking.confirmed": "Rezervace potvrzena",
    "booking.close": "Zavřít",
    "booking.noSlots": "Pro toto datum nejsou volné termíny.",
    "booking.selectService": "Vyberte službu a zobrazí se volné termíny.",
    "booking.selectTime": "Vyberte volný termín.",
    "booking.required": "Vyplňte povinná pole.",
    "booking.loadingSlots": "Kontrolujeme volné termíny…",
    "booking.nameRequired": "Zadejte své jméno.",
    "booking.chooseAnotherDate": "Zkontrolovat další pracovní den",
    "booking.availableTimesForDate": "Volné termíny pro {date}",
    "booking.noSlotsForDate": "Pro {date} nejsou volné termíny.",
    "booking.requiredHint":
      "Pole označená * jsou povinná. E-mail a telefon jsou nepovinné.",
    "booking.optional": "nepovinné",
  },
  en: {
    "common.appName": "Schedule Masters",
    "common.language": "Language",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.retry": "Try again",
    "common.loading": "Loading…",
    "common.error":
      "We could not complete that action. Please try again shortly.",
    "auth.emailLabel": "Email",
    "auth.passwordLabel": "Password",
    "auth.passwordHint": "At least 8 characters",
    "auth.requiredHint": "Fields marked with * are required.",
    "auth.showPassword": "Show password",
    "auth.hidePassword": "Hide password",
    "auth.signIn": "Sign in",
    "auth.signInTitle": "Welcome back",
    "auth.signInPrompt": "Already have an account? Sign in",
    "auth.signUp": "Create account",
    "auth.signUpTitle": "Create your master account",
    "auth.signUpPrompt": "Don't have an account? Sign up",
    "auth.emailInvalid": "Enter a valid email address.",
    "auth.passwordTooShort": "Password must contain at least 8 characters.",
    "auth.invalidCredentials":
      "We could not sign you in. Check your email and password, then try again.",
    "auth.accountExists": "This email is already registered. Try signing in.",
    "auth.networkError":
      "Could not connect. Check your internet connection and try again.",
    "auth.sessionRestoreFailed":
      "Your session could not be restored. Sign in again.",
    "auth.signOutFailed": "Could not sign out. Try again.",
    "auth.confirmationRequired":
      "Check your email, confirm your account, then sign in.",
    "workspace.loadFailedTitle": "We could not load your workspace",
    "workspace.loadFailedDescription":
      "Check your internet connection and try again.",
    "workspace.setupEyebrow": "FIRST SETUP",
    "workspace.setupTitle": "Set up your workspace",
    "workspace.setupDescription":
      "Add your details, first service, and basic working hours. You can change them later.",
    "workspace.namePlaceholder": "Workspace name",
    "workspace.slugPlaceholder": "Booking link, e.g. anna-nails",
    "workspace.servicePlaceholder": "First service",
    "workspace.pricePlaceholder": "Price in CZK",
    "workspace.durationPlaceholder": "Duration in minutes",
    "workspace.startTimeLabel": "Workday starts",
    "workspace.endTimeLabel": "Workday ends",
    "workspace.workingDaysLabel": "Working days",
    "workspace.dayMonday": "Mon",
    "workspace.dayTuesday": "Tue",
    "workspace.dayWednesday": "Wed",
    "workspace.dayThursday": "Thu",
    "workspace.dayFriday": "Fri",
    "workspace.daySaturday": "Sat",
    "workspace.daySunday": "Sun",
    "workspace.setupRequiredFields":
      "Complete the workspace name, booking link, and service fields.",
    "workspace.setupFailed":
      "We could not save the setup. Check the details and try again.",
    "workspace.setupInvalidSlug":
      "The booking link can contain only lowercase letters, numbers, and hyphens.",
    "workspace.setupInvalidService": "Check the service name and price.",
    "workspace.priceInvalid": "Enter a valid price of 0 CZK or more.",
    "workspace.durationInvalid":
      "Enter a whole number between 1 and 1440 minutes.",
    "workspace.workingDaysInvalid": "Choose at least one working day.",
    "workspace.scheduleInvalid":
      "Enter time in HH:MM format. The end must be after the start.",
    "workspace.setupSaving": "Saving…",
    "workspace.setupSave": "Save and continue",
    "workspace.setupStepMaster": "Master details",
    "workspace.setupStepMasterDescription":
      "Set the workspace name and the link clients will use to book.",
    "workspace.setupStepService": "First service",
    "workspace.setupStepServiceDescription":
      "Add the service clients will be able to choose when booking.",
    "workspace.setupStepSchedule": "Working days and hours",
    "workspace.setupStepScheduleDescription":
      "Choose the days and time range when you accept clients.",
    "workspace.setupCompleteTitle": "You're all set",
    "workspace.setupCompleteDescription":
      "Your workspace, first service, and schedule are ready. You can start working.",
    "workspace.setupOpenDashboard": "Open Dashboard",
    "workspace.setupOpenBooking": "Open booking page",
    "workspace.setupNext": "Continue",
    "workspace.setupBack": "Back",
    "workspace.setupFinish": "Go to Dashboard",
    "mobile.description": "The master mobile app is ready.",
    "mobile.demoMode": "Demo mode",
    "mobile.todaySchedule": "Today's schedule",
    "mobile.freeSlots": "Free slots",
    "mobile.available": "Available",
    "mobile.pending": "Pending confirmation",
    "mobile.confirmed": "Confirmed",
    "mobile.today": "Today",
    "mobile.calendar": "Calendar",
    "mobile.profile": "Profile",
    "mobile.newBooking": "New booking",
    "mobile.newBookingNoticeTitle": "New booking",
    "mobile.newBookingNoticeDescription":
      "The booking creation form will be added in the next MVP step.",
    "mobile.newBookingNoticeClose": "Close",
    "mobile.bookings": "Bookings",
    "mobile.expectedRevenue": "Expected revenue",
    "mobile.nextBooking": "Next booking",
    "mobile.noBookingsToday": "There are no bookings today.",
    "mobile.firstService": "Your first service",
    "mobile.noServices": "No active services yet.",
    "mobile.workingHours": "Working hours",
    "mobile.publicBookingLink": "Public booking link",
    "mobile.publicBookingDescription":
      "Clients can choose a service and available time.",
    "mobile.personalBlocks": "Personal blocks",
    "mobile.personalBlockEmpty":
      "There are no personal blocks in the next few days.",
    "mobile.personalBlockTitle": "Block time",
    "mobile.personalBlockDescription":
      "Add a break or personal task. This time will disappear from available slots.",
    "mobile.personalBlockDate": "Date",
    "mobile.personalBlockDatePlaceholder": "YYYY-MM-DD",
    "mobile.personalBlockDateInvalid": "Enter a date in YYYY-MM-DD format.",
    "mobile.personalBlockStart": "Start",
    "mobile.personalBlockEnd": "End",
    "mobile.personalBlockTimePlaceholder": "HH:MM",
    "mobile.personalBlockTimeInvalid": "Enter time in HH:MM format.",
    "mobile.personalBlockEndBeforeStart":
      "End time must be later than start time.",
    "mobile.personalBlockReason": "Name or reason",
    "mobile.personalBlockReasonPlaceholder": "For example, lunch",
    "mobile.personalBlockCreate": "Block time",
    "mobile.personalBlockAdd": "Add break",
    "mobile.personalBlockDelete": "Delete",
    "mobile.personalBlockOverlap":
      "This time overlaps an existing booking or block.",
    "mobile.signOut": "Sign out",
    "booking.description": "The online booking page is ready.",
    "booking.chooseService": "Choose a service",
    "booking.chooseDate": "Choose a date",
    "booking.chooseTime": "Choose a time",
    "booking.yourDetails": "Your details",
    "booking.name": "Name",
    "booking.email": "Email",
    "booking.phone": "Phone",
    "booking.note": "Note",
    "booking.confirm": "Confirm booking",
    "booking.confirmed": "Booking confirmed",
    "booking.close": "Close",
    "booking.noSlots": "There are no available times on this date.",
    "booking.selectService": "Choose a service to see available times.",
    "booking.selectTime": "Choose an available time.",
    "booking.required": "Please complete the required fields.",
    "booking.loadingSlots": "Checking availability…",
    "booking.nameRequired": "Enter your name.",
    "booking.chooseAnotherDate": "Check the next working day",
    "booking.availableTimesForDate": "Available times for {date}",
    "booking.noSlotsForDate": "There are no available times on {date}.",
    "booking.requiredHint":
      "Fields marked with * are required. Email and phone are optional.",
    "booking.optional": "optional",
  },
};

export function resolveLocale(
  value: string | null | undefined,
): SupportedLocale {
  const normalized = value?.trim().toLowerCase().replace("_", "-");

  if (!normalized) {
    return fallbackLocale;
  }

  if (normalized === "cz" || normalized.startsWith("cs-")) {
    return "cz";
  }

  if (normalized === "ru" || normalized.startsWith("ru-")) {
    return "ru";
  }

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }

  return fallbackLocale;
}

export function detectLocale(value?: string | null): SupportedLocale {
  if (value) {
    return resolveLocale(value);
  }

  if (typeof Intl !== "undefined") {
    return resolveLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  }

  return fallbackLocale;
}

export function getIntlLocale(locale: SupportedLocale): string {
  return intlLocales[locale];
}

export function translate(locale: SupportedLocale, key: MessageKey): string {
  return messages[locale][key] ?? messages[fallbackLocale][key];
}

export function createTranslator(locale: SupportedLocale) {
  return (key: MessageKey) => translate(locale, key);
}

export function formatDate(
  value: Date | number,
  locale: SupportedLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(value);
}

export function formatTime(
  value: Date | number,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" },
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(value);
}

export function formatDateTime(
  value: Date | number,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  return formatDate(value, locale, options);
}

export function formatCurrency(
  value: number,
  locale: SupportedLocale,
  currency = "CZK",
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency,
  }).format(value);
}

export const localeLabels: Record<SupportedLocale, string> = {
  ru: "RU",
  cz: "CZ",
  en: "EN",
};
