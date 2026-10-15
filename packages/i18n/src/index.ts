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
  | "common.back"
  | "common.next"
  | "common.retry"
  | "common.loading"
  | "common.error"
  | "common.done"
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
  | "auth.confirmationCallbackFailed"
  | "auth.confirmationTitle"
  | "auth.confirmationDescription"
  | "auth.confirmationEmailLabel"
  | "auth.confirmationBackToSignIn"
  | "auth.emailNotConfirmed"
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
  | "workspace.settingsTitle"
  | "workspace.settingsDescription"
  | "workspace.settingsEdit"
  | "workspace.settingsName"
  | "workspace.settingsSlug"
  | "workspace.settingsSave"
  | "workspace.settingsSaving"
  | "workspace.settingsNameInvalid"
  | "workspace.settingsSlugTaken"
  | "workspace.settingsAdvancedSchedule"
  | "workspace.settingsSaveFailed"
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
  | "mobile.freeSlotsDescription"
  | "mobile.freeSlotsChooseService"
  | "mobile.freeSlotsChooseDate"
  | "mobile.freeSlotsChooseTime"
  | "mobile.freeSlotsNoAvailability"
  | "mobile.freeSlotsNoSlots"
  | "mobile.freeSlotsLoadFailed"
  | "mobile.freeSlotsBook"
  | "mobile.available"
  | "mobile.pending"
  | "mobile.confirmed"
  | "mobile.statusCancelledByCustomer"
  | "mobile.statusCancelledByMaster"
  | "mobile.statusCompleted"
  | "mobile.statusNoShow"
  | "mobile.appointmentDetails"
  | "mobile.appointmentStatus"
  | "mobile.appointmentStatusUpdated"
  | "mobile.appointmentDate"
  | "mobile.appointmentTime"
  | "mobile.appointmentService"
  | "mobile.appointmentPrice"
  | "mobile.confirmBooking"
  | "mobile.cancelBooking"
  | "mobile.completeBooking"
  | "mobile.markNoShow"
  | "mobile.noStatusActions"
  | "mobile.statusUpdateFailed"
  | "mobile.shareAppointment"
  | "mobile.shareConsent"
  | "mobile.shareConsentRequired"
  | "mobile.shareManualDelivery"
  | "mobile.shareSheetOpened"
  | "mobile.shareSheetFailed"
  | "mobile.today"
  | "mobile.previousDay"
  | "mobile.nextDay"
  | "mobile.todayLoadFailed"
  | "mobile.todayRetry"
  | "mobile.calendar"
  | "mobile.customers"
  | "mobile.customerSearch"
  | "mobile.customerEmpty"
  | "mobile.customerSearchEmpty"
  | "mobile.customerLoadFailed"
  | "mobile.customerRetry"
  | "mobile.customerNew"
  | "mobile.customerReturning"
  | "mobile.customerLongAbsent"
  | "mobile.customerLongAbsentRule"
  | "mobile.customerNewRule"
  | "mobile.customerReturningRule"
  | "mobile.customerContact"
  | "mobile.customerHistory"
  | "mobile.customerHistoryEmpty"
  | "mobile.customerNote"
  | "mobile.customerBooking"
  | "mobile.customerVisitCount"
  | "mobile.calendarClosed"
  | "mobile.calendarClosedDescription"
  | "mobile.calendarPrevious"
  | "mobile.calendarNext"
  | "mobile.calendarTapToBook"
  | "mobile.calendarDayView"
  | "mobile.calendarWeekView"
  | "mobile.calendarMonthView"
  | "mobile.calendarFeedView"
  | "mobile.calendarFeedAll"
  | "mobile.calendarFeedFuture"
  | "mobile.calendarFeedEmpty"
  | "mobile.calendarFeedEmptyFuture"
  | "mobile.calendarFeedError"
  | "mobile.calendarFeedRetry"
  | "mobile.calendarPreviousMonth"
  | "mobile.calendarNextMonth"
  | "mobile.monthBookings"
  | "mobile.monthBlocks"
  | "mobile.monthNoBookings"
  | "mobile.monthOpenDay"
  | "mobile.weekBookings"
  | "mobile.weekNoBookings"
  | "mobile.profile"
  | "mobile.newBooking"
  | "mobile.newBookingNoticeTitle"
  | "mobile.newBookingNoticeDescription"
  | "mobile.newBookingNoticeClose"
  | "mobile.manualBookingTitle"
  | "mobile.manualBookingDescription"
  | "mobile.manualBookingTimeDescription"
  | "mobile.manualBookingCustomerDescription"
  | "mobile.manualBookingReviewDescription"
  | "mobile.manualBookingStepTime"
  | "mobile.manualBookingStepCustomer"
  | "mobile.manualBookingStepReview"
  | "mobile.manualBookingExistingCustomer"
  | "mobile.manualBookingNewCustomer"
  | "mobile.manualBookingSearchCustomer"
  | "mobile.manualBookingNoCustomers"
  | "mobile.manualBookingCustomerName"
  | "mobile.manualBookingCustomerEmail"
  | "mobile.manualBookingCustomerPhone"
  | "mobile.manualBookingService"
  | "mobile.manualBookingDate"
  | "mobile.manualBookingTime"
  | "mobile.manualBookingNoSlots"
  | "mobile.manualBookingDuration"
  | "mobile.manualBookingPrice"
  | "mobile.manualBookingNote"
  | "mobile.manualBookingNotePlaceholder"
  | "mobile.manualBookingCreate"
  | "mobile.manualBookingCreated"
  | "mobile.manualBookingNameRequired"
  | "mobile.manualBookingEmailInvalid"
  | "mobile.manualBookingDateInvalid"
  | "mobile.manualBookingTimeRequired"
  | "mobile.manualBookingDurationInvalid"
  | "mobile.manualBookingPriceInvalid"
  | "mobile.manualBookingConflict"
  | "mobile.manualBookingLoadFailed"
  | "mobile.bookings"
  | "mobile.expectedRevenue"
  | "mobile.finances"
  | "mobile.financeSummaryTitle"
  | "mobile.financeIncome"
  | "mobile.financeActual"
  | "mobile.financeActualDescription"
  | "mobile.financeProfitUnavailable"
  | "mobile.financeAppointments"
  | "mobile.financePreviousMonth"
  | "mobile.financeNextMonth"
  | "mobile.financeExpected"
  | "mobile.financeExpectedDescription"
  | "mobile.financeCompletedAppointments"
  | "mobile.financeUpcomingAppointments"
  | "mobile.financeCanceledAppointments"
  | "mobile.financeNoShowAppointments"
  | "mobile.financeEmpty"
  | "mobile.financeLoadFailed"
  | "mobile.financeRetry"
  | "mobile.financeNewCustomers"
  | "mobile.financeReturningCustomers"
  | "mobile.financeBookedHours"
  | "mobile.paymentReceived"
  | "mobile.paymentAmountHint"
  | "mobile.paymentAmountInvalid"
  | "mobile.paymentSave"
  | "mobile.paymentSaved"
  | "mobile.paymentSaveFailed"
  | "mobile.nextBooking"
  | "mobile.noBookingsToday"
  | "mobile.noBookingsOnDay"
  | "mobile.daySchedule"
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
  | "mobile.personalBlockCreated"
  | "mobile.personalBlockDeleted"
  | "mobile.datePickerChoose"
  | "mobile.datePickerToday"
  | "mobile.datePickerPreviousMonth"
  | "mobile.datePickerNextMonth"
  | "mobile.services"
  | "mobile.servicesDescription"
  | "mobile.serviceAdd"
  | "mobile.serviceEdit"
  | "mobile.serviceArchive"
  | "mobile.serviceRestore"
  | "mobile.serviceEmpty"
  | "mobile.serviceActive"
  | "mobile.serviceArchived"
  | "mobile.serviceName"
  | "mobile.serviceChoose"
  | "mobile.serviceSearch"
  | "mobile.serviceSearchEmpty"
  | "mobile.serviceCategory"
  | "mobile.serviceAllCategories"
  | "mobile.serviceUncategorized"
  | "mobile.serviceDescription"
  | "mobile.serviceDuration"
  | "mobile.servicePrice"
  | "mobile.serviceCurrency"
  | "mobile.serviceBufferBefore"
  | "mobile.serviceBufferAfter"
  | "mobile.serviceSortOrder"
  | "mobile.serviceSave"
  | "mobile.serviceCreate"
  | "mobile.serviceArchiveConfirm"
  | "mobile.serviceLoadFailed"
  | "mobile.serviceNameInvalid"
  | "mobile.serviceDurationInvalid"
  | "mobile.servicePriceInvalid"
  | "mobile.serviceCurrencyInvalid"
  | "mobile.serviceBufferInvalid"
  | "mobile.serviceDescriptionInvalid"
  | "mobile.serviceSortOrderInvalid"
  | "mobile.signOut"
  | "booking.description"
  | "booking.loadingContext"
  | "booking.unavailableTitle"
  | "booking.unavailableDescription"
  | "booking.unavailable"
  | "booking.availabilityFailed"
  | "booking.submitFailed"
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
  | "booking.requestReceived"
  | "booking.pendingConfirmation"
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
  | "booking.optional"
  | "booking.manageUnavailableTitle"
  | "booking.manageUnavailable"
  | "booking.manageDescription"
  | "booking.manageConfirm"
  | "booking.manageCancel"
  | "booking.managePending"
  | "booking.manageConfirmed"
  | "booking.manageCancelled"
  | "booking.manageCompleted"
  | "booking.manageActionFailed";

type Messages = Record<MessageKey, string>;

const messages: Record<SupportedLocale, Messages> = {
  ru: {
    "common.appName": "Schedule Masters",
    "common.language": "Язык",
    "common.save": "Сохранить",
    "common.cancel": "Отмена",
    "common.back": "Назад",
    "common.next": "Продолжить",
    "common.retry": "Повторить",
    "common.loading": "Загрузка…",
    "common.done": "Готово",
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
    "auth.confirmationTitle": "Подтвердите ваш email",
    "auth.confirmationCallbackFailed":
      "Не удалось подтвердить email. Ссылка могла устареть или уже быть использована. Запросите новое письмо и попробуйте ещё раз.",
    "auth.confirmationDescription":
      "Мы отправили ссылку для подтверждения. Откройте письмо, подтвердите аккаунт и вернитесь в приложение.",
    "auth.confirmationEmailLabel": "Письмо отправлено на",
    "auth.confirmationBackToSignIn": "Перейти ко входу",
    "auth.emailNotConfirmed":
      "Email ещё не подтверждён. Откройте ссылку из письма и попробуйте войти снова.",
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
    "workspace.settingsTitle": "Рабочее пространство",
    "workspace.settingsDescription":
      "Измените название, ссылку для записи и обычные рабочие часы.",
    "workspace.settingsEdit": "Изменить настройки",
    "workspace.settingsName": "Название рабочего пространства",
    "workspace.settingsSlug": "Ссылка для записи",
    "workspace.settingsSave": "Сохранить настройки",
    "workspace.settingsSaving": "Сохранение…",
    "workspace.settingsNameInvalid":
      "Название должно содержать от 1 до 120 символов.",
    "workspace.settingsSlugTaken":
      "Эта ссылка уже используется. Выберите другую.",
    "workspace.settingsAdvancedSchedule":
      "Расписание содержит особые часы или перерывы. Пока его нельзя изменить здесь.",
    "workspace.settingsSaveFailed":
      "Не удалось сохранить настройки. Попробуйте ещё раз.",
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
    "mobile.freeSlotsDescription": "Выберите услугу, дату и свободное время.",
    "mobile.freeSlotsChooseService": "Выберите услугу",
    "mobile.freeSlotsChooseDate": "Доступные дни",
    "mobile.freeSlotsChooseTime": "Свободное время",
    "mobile.freeSlotsNoAvailability":
      "В этом месяце нет доступных окон для выбранной услуги.",
    "mobile.freeSlotsNoSlots":
      "На выбранную дату нет свободных окон. Выберите другой день.",
    "mobile.freeSlotsLoadFailed":
      "Не удалось загрузить свободные окна. Попробуйте ещё раз.",
    "mobile.freeSlotsBook": "Записать клиента",
    "mobile.available": "Свободно",
    "mobile.pending": "Ожидает подтверждения",
    "mobile.confirmed": "Подтверждено",
    "mobile.statusCancelledByCustomer": "Отменено клиентом",
    "mobile.statusCancelledByMaster": "Отменено мастером",
    "mobile.statusCompleted": "Завершено",
    "mobile.statusNoShow": "Клиент не пришёл",
    "mobile.appointmentDetails": "Детали записи",
    "mobile.appointmentStatus": "Статус",
    "mobile.appointmentStatusUpdated": "Статус записи обновлён",
    "mobile.appointmentDate": "Дата",
    "mobile.appointmentTime": "Время",
    "mobile.appointmentService": "Услуга",
    "mobile.appointmentPrice": "Стоимость",
    "mobile.confirmBooking": "Подтвердить запись",
    "mobile.cancelBooking": "Отменить запись",
    "mobile.completeBooking": "Завершить запись",
    "mobile.markNoShow": "Отметить неявку",
    "mobile.noStatusActions": "Для этого статуса нет доступных действий.",
    "mobile.statusUpdateFailed": "Не удалось изменить статус записи.",
    "mobile.shareAppointment": "Поделиться ссылкой для клиента",
    "mobile.shareConsent":
      "Клиент согласился получать сообщения об этой записи.",
    "mobile.shareConsentRequired": "Подтвердите согласие клиента.",
    "mobile.shareManualDelivery":
      "Автоматическая отправка не настроена. Отправьте ссылку клиенту сами и проверьте результат.",
    "mobile.shareSheetOpened":
      "Окно отправки открыто. Доставка не подтверждена — проверьте приложение обмена.",
    "mobile.shareSheetFailed":
      "Не удалось подготовить ссылку или открыть отправку. Она не отмечена как отправленная; попробуйте ещё раз.",
    "mobile.today": "Сегодня",
    "mobile.previousDay": "Предыдущий день",
    "mobile.nextDay": "Следующий день",
    "mobile.todayLoadFailed": "Не удалось загрузить расписание.",
    "mobile.todayRetry": "Повторить",
    "mobile.calendar": "Календарь",
    "mobile.customers": "Клиенты",
    "mobile.customerSearch": "Имя, телефон или email",
    "mobile.customerEmpty": "Клиентов пока нет. Они появятся после записей.",
    "mobile.customerSearchEmpty": "По этому запросу клиентов не найдено.",
    "mobile.customerLoadFailed": "Не удалось загрузить клиентов или историю.",
    "mobile.customerRetry": "Повторить",
    "mobile.customerNew": "Новые",
    "mobile.customerReturning": "Возвращались",
    "mobile.customerLongAbsent": "Давно не были",
    "mobile.customerLongAbsentRule":
      "Последний завершённый визит был более 90 дней назад.",
    "mobile.customerNewRule": "Ноль или один завершённый визит.",
    "mobile.customerReturningRule":
      "Два или больше завершённых визита; последний был не более 90 дней назад.",
    "mobile.customerContact": "Контакты",
    "mobile.customerHistory": "История записей",
    "mobile.customerHistoryEmpty": "Записей пока нет.",
    "mobile.customerNote": "Заметка мастера",
    "mobile.customerBooking": "Создать запись",
    "mobile.customerVisitCount": "Завершённых визитов",
    "mobile.calendarClosed": "Нерабочий день",
    "mobile.calendarClosedDescription":
      "На этот день рабочие часы не настроены.",
    "mobile.calendarPrevious": "Предыдущая дата",
    "mobile.calendarNext": "Следующая дата",
    "mobile.calendarTapToBook": "Нажмите, чтобы создать запись",
    "mobile.calendarDayView": "День",
    "mobile.calendarWeekView": "Неделя",
    "mobile.calendarMonthView": "Месяц",
    "mobile.calendarFeedView": "Лента",
    "mobile.calendarFeedAll": "Все",
    "mobile.calendarFeedFuture": "Будущие",
    "mobile.calendarFeedEmpty": "В этом диапазоне записей и блоков нет.",
    "mobile.calendarFeedEmptyFuture": "Будущих записей и блоков нет.",
    "mobile.calendarFeedError": "Не удалось загрузить записи и блоки.",
    "mobile.calendarFeedRetry": "Повторить",
    "mobile.calendarPreviousMonth": "Предыдущий месяц",
    "mobile.calendarNextMonth": "Следующий месяц",
    "mobile.monthBookings": "записей",
    "mobile.monthBlocks": "блоков",
    "mobile.monthNoBookings": "Нет записей",
    "mobile.monthOpenDay": "Открыть день",
    "mobile.weekBookings": "записей",
    "mobile.weekNoBookings": "Нет записей",
    "mobile.profile": "Профиль",
    "mobile.newBooking": "Новая запись",
    "mobile.newBookingNoticeTitle": "Новая запись",
    "mobile.newBookingNoticeDescription":
      "Форма создания записи появится в следующем шаге MVP.",
    "mobile.newBookingNoticeClose": "Закрыть",
    "mobile.manualBookingTitle": "Новая запись",
    "mobile.manualBookingDescription":
      "Создайте подтверждённую запись для клиента из календаря или мессенджера.",
    "mobile.manualBookingTimeDescription":
      "Сначала выберите услугу, дату и свободное время.",
    "mobile.manualBookingCustomerDescription":
      "Выберите постоянного клиента или добавьте нового.",
    "mobile.manualBookingReviewDescription":
      "Проверьте детали записи перед созданием.",
    "mobile.manualBookingStepTime": "Время",
    "mobile.manualBookingStepCustomer": "Клиент",
    "mobile.manualBookingStepReview": "Проверка",
    "mobile.manualBookingExistingCustomer": "Существующий клиент",
    "mobile.manualBookingNewCustomer": "Новый клиент",
    "mobile.manualBookingSearchCustomer": "Поиск клиента",
    "mobile.manualBookingNoCustomers": "Клиенты пока не добавлены.",
    "mobile.manualBookingCustomerName": "Имя клиента *",
    "mobile.manualBookingCustomerEmail": "Email клиента",
    "mobile.manualBookingCustomerPhone": "Телефон клиента",
    "mobile.manualBookingService": "Услуга",
    "mobile.manualBookingDate": "Дата *",
    "mobile.manualBookingTime": "Свободное время *",
    "mobile.manualBookingNoSlots": "На эту дату нет свободных окон.",
    "mobile.manualBookingDuration": "Длительность, минут *",
    "mobile.manualBookingPrice": "Цена, Kč *",
    "mobile.manualBookingNote": "Заметка мастера",
    "mobile.manualBookingNotePlaceholder": "Например, клиент из Instagram",
    "mobile.manualBookingCreate": "Создать запись",
    "mobile.manualBookingCreated": "Запись создана",
    "mobile.manualBookingNameRequired": "Укажите имя клиента.",
    "mobile.manualBookingEmailInvalid": "Введите корректный email.",
    "mobile.manualBookingDateInvalid": "Выберите корректную дату.",
    "mobile.manualBookingTimeRequired": "Выберите свободное время.",
    "mobile.manualBookingDurationInvalid":
      "Длительность должна быть от 1 до 1440 минут.",
    "mobile.manualBookingPriceInvalid":
      "Цена должна быть неотрицательным числом.",
    "mobile.manualBookingConflict":
      "Это время уже занято. Обновите свободные окна и выберите другое.",
    "mobile.manualBookingLoadFailed":
      "Не удалось загрузить клиентов или свободные окна.",
    "mobile.bookings": "Записи",
    "mobile.expectedRevenue": "Ожидаемая выручка",
    "mobile.finances": "Финансы",
    "mobile.financeSummaryTitle": "Сводка за месяц",
    "mobile.financeIncome": "Сумма по записям",
    "mobile.financeActual": "Получено",
    "mobile.financeActualDescription": "Сумма оплаты, указанная мастером",
    "mobile.financeProfitUnavailable":
      "Это не прибыль: расходы здесь не учитываются.",
    "mobile.financeAppointments": "Записи",
    "mobile.financePreviousMonth": "Предыдущий месяц",
    "mobile.financeNextMonth": "Следующий месяц",
    "mobile.financeExpected": "Ожидается",
    "mobile.financeExpectedDescription":
      "Будущие записи по цене услуг; оплата не подтверждена.",
    "mobile.financeCompletedAppointments": "Состоявшиеся записи",
    "mobile.financeUpcomingAppointments": "Предстоящие записи",
    "mobile.financeCanceledAppointments": "Отменённые записи",
    "mobile.financeNoShowAppointments": "Неявки",
    "mobile.financeEmpty": "За этот месяц записей нет.",
    "mobile.financeLoadFailed": "Не удалось загрузить сводку за месяц.",
    "mobile.financeRetry": "Повторить",
    "mobile.financeNewCustomers": "Новые клиенты",
    "mobile.financeReturningCustomers": "Повторные клиенты",
    "mobile.financeBookedHours": "Занято часов",
    "mobile.paymentReceived": "Получено за запись",
    "mobile.paymentAmountHint": "Цена услуги",
    "mobile.paymentAmountInvalid":
      "Введите сумму от 0 до цены услуги (до 2 знаков после запятой).",
    "mobile.paymentSave": "Сохранить оплату",
    "mobile.paymentSaved": "Оплата сохранена",
    "mobile.paymentSaveFailed": "Не удалось сохранить оплату.",
    "mobile.nextBooking": "Следующая запись",
    "mobile.noBookingsToday": "На сегодня записей нет.",
    "mobile.noBookingsOnDay": "На эту дату записей нет.",
    "mobile.daySchedule": "Расписание дня",
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
    "mobile.personalBlockCreated": "Личный блок добавлен",
    "mobile.personalBlockDeleted": "Личный блок удалён",
    "mobile.datePickerChoose": "Выберите дату",
    "mobile.datePickerToday": "Сегодня",
    "mobile.datePickerPreviousMonth": "Предыдущий месяц",
    "mobile.datePickerNextMonth": "Следующий месяц",
    "mobile.services": "Услуги",
    "mobile.servicesDescription":
      "Управляйте услугами, ценами и длительностью записей.",
    "mobile.serviceAdd": "Добавить услугу",
    "mobile.serviceEdit": "Изменить",
    "mobile.serviceArchive": "Архивировать",
    "mobile.serviceRestore": "Восстановить",
    "mobile.serviceEmpty": "Услуг пока нет.",
    "mobile.serviceActive": "Активные",
    "mobile.serviceArchived": "Архив",
    "mobile.serviceName": "Название услуги *",
    "mobile.serviceChoose": "Выберите услугу",
    "mobile.serviceSearch": "Найти услугу",
    "mobile.serviceSearchEmpty": "Услуги не найдены.",
    "mobile.serviceCategory": "Категория",
    "mobile.serviceAllCategories": "Все",
    "mobile.serviceUncategorized": "Без категории",
    "mobile.serviceDescription": "Описание",
    "mobile.serviceDuration": "Длительность, минут *",
    "mobile.servicePrice": "Цена *",
    "mobile.serviceCurrency": "Валюта *",
    "mobile.serviceBufferBefore": "Перерыв до, минут",
    "mobile.serviceBufferAfter": "Перерыв после, минут",
    "mobile.serviceSortOrder": "Порядок",
    "mobile.serviceSave": "Сохранить услугу",
    "mobile.serviceCreate": "Создать услугу",
    "mobile.serviceArchiveConfirm":
      "Услуга исчезнет из новых записей, но старые записи сохранятся.",
    "mobile.serviceLoadFailed": "Не удалось загрузить услуги.",
    "mobile.serviceNameInvalid": "Введите название до 120 символов.",
    "mobile.serviceDurationInvalid":
      "Длительность должна быть от 1 до 1440 минут.",
    "mobile.servicePriceInvalid": "Цена должна быть числом от 0 до 1 000 000.",
    "mobile.serviceCurrencyInvalid": "Используйте код валюты из 3 букв.",
    "mobile.serviceBufferInvalid":
      "Перерыв должен быть целым числом от 0 до 240 минут.",
    "mobile.serviceDescriptionInvalid":
      "Описание не должно быть длиннее 1000 символов.",
    "mobile.serviceSortOrderInvalid":
      "Порядок должен быть целым числом от 0 до 100 000.",
    "mobile.signOut": "Выйти",
    "booking.description": "Страница онлайн-записи готова к работе.",
    "booking.loadingContext": "Загружаем страницу записи…",
    "booking.unavailableTitle": "Страница записи недоступна",
    "booking.unavailableDescription":
      "Возможно, ссылка неполная или страница временно отключена. Попросите мастера прислать актуальную ссылку.",
    "booking.unavailable": "Не удалось загрузить страницу записи.",
    "booking.availabilityFailed": "Не удалось проверить свободное время.",
    "booking.submitFailed":
      "Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.",
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
    "booking.requestReceived": "Заявка на запись отправлена",
    "booking.pendingConfirmation":
      "Мастер должен подтвердить время. Вы получите обновление, когда запись будет подтверждена.",
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
    "booking.manageUnavailableTitle": "Ссылка недействительна",
    "booking.manageUnavailable":
      "Срок ссылки истёк или запись больше недоступна. Попросите мастера прислать новую ссылку.",
    "booking.manageDescription": "Детали вашей записи",
    "booking.manageConfirm": "Подтвердить запись",
    "booking.manageCancel": "Отменить запись",
    "booking.managePending": "Ожидает подтверждения",
    "booking.manageConfirmed": "Подтверждена",
    "booking.manageCancelled": "Отменена",
    "booking.manageCompleted": "Завершена",
    "booking.manageActionFailed":
      "Не удалось обновить запись. Попробуйте ещё раз.",
  },
  cz: {
    "common.appName": "Schedule Masters",
    "common.language": "Jazyk",
    "common.save": "Uložit",
    "common.cancel": "Zrušit",
    "common.back": "Zpět",
    "common.next": "Pokračovat",
    "common.retry": "Zkusit znovu",
    "common.loading": "Načítání…",
    "common.done": "Hotovo",
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
    "auth.confirmationTitle": "Potvrďte svůj e-mail",
    "auth.confirmationCallbackFailed":
      "E-mail se nepodařilo potvrdit. Odkaz mohl vypršet nebo už byl použit. Vyžádejte si nový e-mail a zkuste to znovu.",
    "auth.confirmationDescription":
      "Odeslali jsme vám potvrzovací odkaz. Otevřete e-mail, potvrďte účet a vraťte se do aplikace.",
    "auth.confirmationEmailLabel": "E-mail byl odeslán na",
    "auth.confirmationBackToSignIn": "Přejít k přihlášení",
    "auth.emailNotConfirmed":
      "E-mail ještě není potvrzený. Otevřete odkaz z e-mailu a zkuste se přihlásit znovu.",
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
    "workspace.settingsTitle": "Pracovní prostor",
    "workspace.settingsDescription":
      "Upravte název, odkaz pro rezervace a běžnou pracovní dobu.",
    "workspace.settingsEdit": "Upravit nastavení",
    "workspace.settingsName": "Název pracovního prostoru",
    "workspace.settingsSlug": "Odkaz pro rezervace",
    "workspace.settingsSave": "Uložit nastavení",
    "workspace.settingsSaving": "Ukládání…",
    "workspace.settingsNameInvalid": "Název musí obsahovat 1 až 120 znaků.",
    "workspace.settingsSlugTaken": "Tento odkaz už někdo používá. Zvolte jiný.",
    "workspace.settingsAdvancedSchedule":
      "Rozvrh obsahuje zvláštní pracovní dobu nebo přestávky. Zde jej zatím nelze upravit.",
    "workspace.settingsSaveFailed":
      "Nastavení se nepodařilo uložit. Zkuste to znovu.",
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
    "mobile.freeSlotsDescription": "Vyberte službu, datum a volný termín.",
    "mobile.freeSlotsChooseService": "Vyberte službu",
    "mobile.freeSlotsChooseDate": "Dostupné dny",
    "mobile.freeSlotsChooseTime": "Volné termíny",
    "mobile.freeSlotsNoAvailability":
      "Tento měsíc nejsou pro vybranou službu volné termíny.",
    "mobile.freeSlotsNoSlots":
      "Ve vybraný den nejsou volné termíny. Zvolte jiný den.",
    "mobile.freeSlotsLoadFailed":
      "Volné termíny se nepodařilo načíst. Zkuste to znovu.",
    "mobile.freeSlotsBook": "Objednat klienta",
    "mobile.available": "Volno",
    "mobile.pending": "Čeká na potvrzení",
    "mobile.confirmed": "Potvrzeno",
    "mobile.statusCancelledByCustomer": "Zrušeno klientem",
    "mobile.statusCancelledByMaster": "Zrušeno mistrem",
    "mobile.statusCompleted": "Dokončeno",
    "mobile.statusNoShow": "Klient nepřišel",
    "mobile.appointmentDetails": "Detail rezervace",
    "mobile.appointmentStatus": "Stav",
    "mobile.appointmentStatusUpdated": "Stav rezervace byl aktualizován",
    "mobile.appointmentDate": "Datum",
    "mobile.appointmentTime": "Čas",
    "mobile.appointmentService": "Služba",
    "mobile.appointmentPrice": "Cena",
    "mobile.confirmBooking": "Potvrdit rezervaci",
    "mobile.cancelBooking": "Zrušit rezervaci",
    "mobile.completeBooking": "Označit jako dokončenou",
    "mobile.markNoShow": "Označit jako nedostavení",
    "mobile.noStatusActions": "Pro tento stav nejsou dostupné žádné akce.",
    "mobile.statusUpdateFailed": "Stav rezervace se nepodařilo změnit.",
    "mobile.shareAppointment": "Sdílet odkaz s klientem",
    "mobile.shareConsent": "Klient souhlasil se zprávami o této rezervaci.",
    "mobile.shareConsentRequired": "Potvrďte souhlas klienta.",
    "mobile.shareManualDelivery":
      "Automatické odesílání není nastavené. Odkaz odešlete sami a ověřte výsledek.",
    "mobile.shareSheetOpened":
      "Nabídka sdílení byla otevřena. Doručení není potvrzeno; zkontrolujte aplikaci.",
    "mobile.shareSheetFailed":
      "Odkaz se nepodařilo připravit nebo otevřít sdílení. Odeslání není potvrzeno; zkuste to znovu.",
    "mobile.today": "Dnes",
    "mobile.previousDay": "Předchozí den",
    "mobile.nextDay": "Následující den",
    "mobile.todayLoadFailed": "Nepodařilo se načíst rozvrh.",
    "mobile.todayRetry": "Zkusit znovu",
    "mobile.calendar": "Kalendář",
    "mobile.customers": "Klienti",
    "mobile.customerSearch": "Jméno, telefon nebo e-mail",
    "mobile.customerEmpty":
      "Zatím nemáte žádné klienty. Zobrazí se po vytvoření rezervace.",
    "mobile.customerSearchEmpty": "Tomuto hledání neodpovídají žádní klienti.",
    "mobile.customerLoadFailed": "Klienty nebo historii se nepodařilo načíst.",
    "mobile.customerRetry": "Zkusit znovu",
    "mobile.customerNew": "Noví",
    "mobile.customerReturning": "Vracejí se",
    "mobile.customerLongAbsent": "Dlouho nepřišli",
    "mobile.customerLongAbsentRule":
      "Poslední dokončená návštěva byla před více než 90 dny.",
    "mobile.customerNewRule": "Nula nebo jedna dokončená návštěva.",
    "mobile.customerReturningRule":
      "Alespoň dvě dokončené návštěvy; poslední proběhla před nejvýše 90 dny.",
    "mobile.customerContact": "Kontakty",
    "mobile.customerHistory": "Historie rezervací",
    "mobile.customerHistoryEmpty": "Zatím nemá žádné rezervace.",
    "mobile.customerNote": "Poznámka mistra",
    "mobile.customerBooking": "Vytvořit rezervaci",
    "mobile.customerVisitCount": "Dokončené návštěvy",
    "mobile.calendarClosed": "Nepracovní den",
    "mobile.calendarClosedDescription":
      "Pro tento den nejsou nastavené pracovní hodiny.",
    "mobile.calendarPrevious": "Předchozí datum",
    "mobile.calendarNext": "Následující datum",
    "mobile.calendarTapToBook": "Klepnutím vytvoříte rezervaci",
    "mobile.calendarDayView": "Den",
    "mobile.calendarWeekView": "Týden",
    "mobile.calendarMonthView": "Měsíc",
    "mobile.calendarFeedView": "Přehled",
    "mobile.calendarFeedAll": "Vše",
    "mobile.calendarFeedFuture": "Budoucí",
    "mobile.calendarFeedEmpty":
      "V tomto období nejsou žádné rezervace ani bloky.",
    "mobile.calendarFeedEmptyFuture":
      "Nemáte žádné budoucí rezervace ani bloky.",
    "mobile.calendarFeedError": "Rezervace a bloky se nepodařilo načíst.",
    "mobile.calendarFeedRetry": "Zkusit znovu",
    "mobile.calendarPreviousMonth": "Předchozí měsíc",
    "mobile.calendarNextMonth": "Následující měsíc",
    "mobile.monthBookings": "rezervací",
    "mobile.monthBlocks": "bloků",
    "mobile.monthNoBookings": "Žádné rezervace",
    "mobile.monthOpenDay": "Otevřít den",
    "mobile.weekBookings": "rezervací",
    "mobile.weekNoBookings": "Žádné rezervace",
    "mobile.profile": "Profil",
    "mobile.newBooking": "Nová rezervace",
    "mobile.newBookingNoticeTitle": "Nová rezervace",
    "mobile.newBookingNoticeDescription":
      "Formulář pro vytvoření rezervace bude přidán v dalším kroku MVP.",
    "mobile.newBookingNoticeClose": "Zavřít",
    "mobile.manualBookingTitle": "Nová rezervace",
    "mobile.manualBookingDescription":
      "Vytvořte potvrzenou rezervaci pro klienta z kalendáře nebo zpráv.",
    "mobile.manualBookingTimeDescription":
      "Nejprve vyberte službu, datum a volný čas.",
    "mobile.manualBookingCustomerDescription":
      "Vyberte stávajícího klienta nebo přidejte nového.",
    "mobile.manualBookingReviewDescription":
      "Před vytvořením zkontrolujte podrobnosti rezervace.",
    "mobile.manualBookingStepTime": "Čas",
    "mobile.manualBookingStepCustomer": "Klient",
    "mobile.manualBookingStepReview": "Kontrola",
    "mobile.manualBookingExistingCustomer": "Stávající klient",
    "mobile.manualBookingNewCustomer": "Nový klient",
    "mobile.manualBookingSearchCustomer": "Hledat klienta",
    "mobile.manualBookingNoCustomers": "Zatím nemáte žádné klienty.",
    "mobile.manualBookingCustomerName": "Jméno klienta *",
    "mobile.manualBookingCustomerEmail": "E-mail klienta",
    "mobile.manualBookingCustomerPhone": "Telefon klienta",
    "mobile.manualBookingService": "Služba",
    "mobile.manualBookingDate": "Datum *",
    "mobile.manualBookingTime": "Volný termín *",
    "mobile.manualBookingNoSlots": "Pro toto datum nejsou volné termíny.",
    "mobile.manualBookingDuration": "Délka v minutách *",
    "mobile.manualBookingPrice": "Cena, Kč *",
    "mobile.manualBookingNote": "Poznámka mistra",
    "mobile.manualBookingNotePlaceholder": "Například klient z Instagramu",
    "mobile.manualBookingCreate": "Vytvořit rezervaci",
    "mobile.manualBookingCreated": "Rezervace vytvořena",
    "mobile.manualBookingNameRequired": "Zadejte jméno klienta.",
    "mobile.manualBookingEmailInvalid": "Zadejte platný e-mail.",
    "mobile.manualBookingDateInvalid": "Vyberte platné datum.",
    "mobile.manualBookingTimeRequired": "Vyberte volný termín.",
    "mobile.manualBookingDurationInvalid":
      "Délka musí být mezi 1 a 1440 minutami.",
    "mobile.manualBookingPriceInvalid": "Cena musí být nezáporné číslo.",
    "mobile.manualBookingConflict":
      "Tento termín je již obsazený. Obnovte termíny a vyberte jiný.",
    "mobile.manualBookingLoadFailed":
      "Nepodařilo se načíst klienty nebo volné termíny.",
    "mobile.bookings": "Rezervace",
    "mobile.expectedRevenue": "Očekávané tržby",
    "mobile.finances": "Finance",
    "mobile.financeSummaryTitle": "Měsíční přehled",
    "mobile.financeIncome": "Částky podle rezervací",
    "mobile.financeActual": "Přijato",
    "mobile.financeActualDescription": "Částka platby zadaná poskytovatelem",
    "mobile.financeProfitUnavailable":
      "Nejde o zisk: výdaje se zde nezohledňují.",
    "mobile.financeAppointments": "Rezervace",
    "mobile.financePreviousMonth": "Předchozí měsíc",
    "mobile.financeNextMonth": "Následující měsíc",
    "mobile.financeExpected": "Očekává se",
    "mobile.financeExpectedDescription":
      "Budoucí rezervace podle ceny služby; platba není potvrzena.",
    "mobile.financeCompletedAppointments": "Dokončené rezervace",
    "mobile.financeUpcomingAppointments": "Nadcházející rezervace",
    "mobile.financeCanceledAppointments": "Zrušené rezervace",
    "mobile.financeNoShowAppointments": "Nedostavení se",
    "mobile.financeEmpty": "Pro tento měsíc nejsou žádné rezervace.",
    "mobile.financeLoadFailed": "Měsíční přehled se nepodařilo načíst.",
    "mobile.financeRetry": "Zkusit znovu",
    "mobile.financeNewCustomers": "Noví klienti",
    "mobile.financeReturningCustomers": "Vracející se klienti",
    "mobile.financeBookedHours": "Obsazené hodiny",
    "mobile.paymentReceived": "Přijato za rezervaci",
    "mobile.paymentAmountHint": "Cena služby",
    "mobile.paymentAmountInvalid":
      "Zadejte částku od 0 do ceny služby (max. 2 desetinná místa).",
    "mobile.paymentSave": "Uložit platbu",
    "mobile.paymentSaved": "Platba uložena",
    "mobile.paymentSaveFailed": "Platbu se nepodařilo uložit.",
    "mobile.nextBooking": "Další rezervace",
    "mobile.noBookingsToday": "Na dnešek nemáte žádné rezervace.",
    "mobile.noBookingsOnDay": "Na tento den nejsou žádné rezervace.",
    "mobile.daySchedule": "Denní rozvrh",
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
    "mobile.personalBlockCreated": "Osobní blok byl přidán",
    "mobile.personalBlockDeleted": "Osobní blok byl smazán",
    "mobile.datePickerChoose": "Vyberte datum",
    "mobile.datePickerToday": "Dnes",
    "mobile.datePickerPreviousMonth": "Předchozí měsíc",
    "mobile.datePickerNextMonth": "Další měsíc",
    "mobile.services": "Služby",
    "mobile.servicesDescription": "Spravujte služby, ceny a délku rezervací.",
    "mobile.serviceAdd": "Přidat službu",
    "mobile.serviceEdit": "Upravit",
    "mobile.serviceArchive": "Archivovat",
    "mobile.serviceRestore": "Obnovit",
    "mobile.serviceEmpty": "Zatím nemáte žádné služby.",
    "mobile.serviceActive": "Aktivní",
    "mobile.serviceArchived": "Archiv",
    "mobile.serviceName": "Název služby *",
    "mobile.serviceChoose": "Vyberte službu",
    "mobile.serviceSearch": "Hledat službu",
    "mobile.serviceSearchEmpty": "Žádné služby nebyly nalezeny.",
    "mobile.serviceCategory": "Kategorie",
    "mobile.serviceAllCategories": "Vše",
    "mobile.serviceUncategorized": "Bez kategorie",
    "mobile.serviceDescription": "Popis",
    "mobile.serviceDuration": "Délka v minutách *",
    "mobile.servicePrice": "Cena *",
    "mobile.serviceCurrency": "Měna *",
    "mobile.serviceBufferBefore": "Pauza před, minuty",
    "mobile.serviceBufferAfter": "Pauza po, minuty",
    "mobile.serviceSortOrder": "Pořadí",
    "mobile.serviceSave": "Uložit službu",
    "mobile.serviceCreate": "Vytvořit službu",
    "mobile.serviceArchiveConfirm":
      "Služba zmizí z nových rezervací, ale staré rezervace zůstanou.",
    "mobile.serviceLoadFailed": "Nepodařilo se načíst služby.",
    "mobile.serviceNameInvalid": "Zadejte název do 120 znaků.",
    "mobile.serviceDurationInvalid": "Délka musí být mezi 1 a 1440 minutami.",
    "mobile.servicePriceInvalid": "Cena musí být číslo od 0 do 1 000 000.",
    "mobile.serviceCurrencyInvalid": "Použijte třípísmenný kód měny.",
    "mobile.serviceBufferInvalid":
      "Pauza musí být celé číslo od 0 do 240 minut.",
    "mobile.serviceDescriptionInvalid": "Popis nesmí být delší než 1000 znaků.",
    "mobile.serviceSortOrderInvalid":
      "Pořadí musí být celé číslo od 0 do 100 000.",
    "mobile.signOut": "Odhlásit se",
    "booking.description": "Stránka online rezervací je připravena.",
    "booking.loadingContext": "Načítáme stránku rezervace…",
    "booking.unavailableTitle": "Stránka rezervace není dostupná",
    "booking.unavailableDescription":
      "Odkaz může být neúplný nebo stránka dočasně vypnutá. Požádejte prosím o nový odkaz.",
    "booking.unavailable": "Stránku rezervace se nepodařilo načíst.",
    "booking.availabilityFailed": "Volné termíny se nepodařilo ověřit.",
    "booking.submitFailed":
      "Rezervaci se nepodařilo odeslat. Zkontrolujte připojení a zkuste to znovu.",
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
    "booking.requestReceived": "Žádost o rezervaci byla odeslána",
    "booking.pendingConfirmation":
      "Termín musí potvrdit mistr. Jakmile bude rezervace potvrzena, zobrazíme vám aktualizaci.",
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
    "booking.manageUnavailableTitle": "Odkaz není platný",
    "booking.manageUnavailable":
      "Odkaz vypršel nebo rezervace již není dostupná. Požádejte mistra o nový odkaz.",
    "booking.manageDescription": "Podrobnosti rezervace",
    "booking.manageConfirm": "Potvrdit rezervaci",
    "booking.manageCancel": "Zrušit rezervaci",
    "booking.managePending": "Čeká na potvrzení",
    "booking.manageConfirmed": "Potvrzeno",
    "booking.manageCancelled": "Zrušeno",
    "booking.manageCompleted": "Dokončeno",
    "booking.manageActionFailed":
      "Rezervaci se nepodařilo změnit. Zkuste to znovu.",
  },
  en: {
    "common.appName": "Schedule Masters",
    "common.language": "Language",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.back": "Back",
    "common.next": "Continue",
    "common.retry": "Try again",
    "common.loading": "Loading…",
    "common.done": "Done",
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
    "auth.confirmationTitle": "Confirm your email",
    "auth.confirmationCallbackFailed":
      "We could not confirm your email. The link may have expired or already been used. Request a new email and try again.",
    "auth.confirmationDescription":
      "We sent you a confirmation link. Open the email, confirm your account, then return to the app.",
    "auth.confirmationEmailLabel": "Confirmation email sent to",
    "auth.confirmationBackToSignIn": "Go to sign in",
    "auth.emailNotConfirmed":
      "Your email is not confirmed yet. Open the link in the email and try signing in again.",
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
    "workspace.settingsTitle": "Workspace settings",
    "workspace.settingsDescription":
      "Update the workspace name, booking link, and regular working hours.",
    "workspace.settingsEdit": "Edit settings",
    "workspace.settingsName": "Workspace name",
    "workspace.settingsSlug": "Booking link",
    "workspace.settingsSave": "Save settings",
    "workspace.settingsSaving": "Saving…",
    "workspace.settingsNameInvalid":
      "The name must be between 1 and 120 characters.",
    "workspace.settingsSlugTaken":
      "This booking link is already in use. Choose another.",
    "workspace.settingsAdvancedSchedule":
      "This schedule has date-specific hours or breaks and cannot be edited here yet.",
    "workspace.settingsSaveFailed":
      "Could not save settings. Please try again.",
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
    "mobile.freeSlotsDescription":
      "Choose a service, date, and available time.",
    "mobile.freeSlotsChooseService": "Choose a service",
    "mobile.freeSlotsChooseDate": "Available days",
    "mobile.freeSlotsChooseTime": "Available times",
    "mobile.freeSlotsNoAvailability":
      "No times are available for this service this month.",
    "mobile.freeSlotsNoSlots":
      "No times are available on this date. Choose another day.",
    "mobile.freeSlotsLoadFailed":
      "Couldn't load available times. Please try again.",
    "mobile.freeSlotsBook": "Book client",
    "mobile.available": "Available",
    "mobile.pending": "Pending confirmation",
    "mobile.confirmed": "Confirmed",
    "mobile.statusCancelledByCustomer": "Cancelled by customer",
    "mobile.statusCancelledByMaster": "Cancelled by master",
    "mobile.statusCompleted": "Completed",
    "mobile.statusNoShow": "No-show",
    "mobile.appointmentDetails": "Appointment details",
    "mobile.appointmentStatus": "Status",
    "mobile.appointmentStatusUpdated": "Booking status updated",
    "mobile.appointmentDate": "Date",
    "mobile.appointmentTime": "Time",
    "mobile.appointmentService": "Service",
    "mobile.appointmentPrice": "Price",
    "mobile.confirmBooking": "Confirm booking",
    "mobile.cancelBooking": "Cancel booking",
    "mobile.completeBooking": "Complete booking",
    "mobile.markNoShow": "Mark as no-show",
    "mobile.noStatusActions": "No actions are available for this status.",
    "mobile.statusUpdateFailed": "The booking status could not be changed.",
    "mobile.shareAppointment": "Share customer link",
    "mobile.shareConsent":
      "The customer agreed to receive messages about this appointment.",
    "mobile.shareConsentRequired": "Confirm the customer's consent.",
    "mobile.shareManualDelivery":
      "Automatic sending is not configured. Share the link yourself and verify delivery.",
    "mobile.shareSheetOpened":
      "The share sheet opened. Delivery is not confirmed; check the sharing app.",
    "mobile.shareSheetFailed":
      "We couldn't prepare the link or open sharing. It is not marked as sent; try again.",
    "mobile.today": "Today",
    "mobile.previousDay": "Previous day",
    "mobile.nextDay": "Next day",
    "mobile.todayLoadFailed": "The schedule could not be loaded.",
    "mobile.todayRetry": "Try again",
    "mobile.calendar": "Calendar",
    "mobile.customers": "Customers",
    "mobile.customerSearch": "Name, phone, or email",
    "mobile.customerEmpty":
      "No customers yet. They appear after a booking is made.",
    "mobile.customerSearchEmpty": "No customers match this search.",
    "mobile.customerLoadFailed": "Customers or history could not be loaded.",
    "mobile.customerRetry": "Try again",
    "mobile.customerNew": "New",
    "mobile.customerReturning": "Returning",
    "mobile.customerLongAbsent": "Haven't visited lately",
    "mobile.customerLongAbsentRule":
      "The last completed visit was more than 90 days ago.",
    "mobile.customerNewRule": "Zero or one completed visit.",
    "mobile.customerReturningRule":
      "Two or more completed visits; the latest was within the last 90 days.",
    "mobile.customerContact": "Contact",
    "mobile.customerHistory": "Booking history",
    "mobile.customerHistoryEmpty": "There are no bookings yet.",
    "mobile.customerNote": "Master's note",
    "mobile.customerBooking": "Create booking",
    "mobile.customerVisitCount": "Completed visits",
    "mobile.calendarClosed": "Closed day",
    "mobile.calendarClosedDescription":
      "Working hours are not configured for this day.",
    "mobile.calendarPrevious": "Previous date",
    "mobile.calendarNext": "Next date",
    "mobile.calendarTapToBook": "Tap to create a booking",
    "mobile.calendarDayView": "Day",
    "mobile.calendarWeekView": "Week",
    "mobile.calendarMonthView": "Month",
    "mobile.calendarFeedView": "Feed",
    "mobile.calendarFeedAll": "All",
    "mobile.calendarFeedFuture": "Upcoming",
    "mobile.calendarFeedEmpty":
      "There are no bookings or blocks in this range.",
    "mobile.calendarFeedEmptyFuture":
      "There are no upcoming bookings or blocks.",
    "mobile.calendarFeedError": "Bookings and blocks could not be loaded.",
    "mobile.calendarFeedRetry": "Try again",
    "mobile.calendarPreviousMonth": "Previous month",
    "mobile.calendarNextMonth": "Next month",
    "mobile.monthBookings": "bookings",
    "mobile.monthBlocks": "blocks",
    "mobile.monthNoBookings": "No bookings",
    "mobile.monthOpenDay": "Open day",
    "mobile.weekBookings": "bookings",
    "mobile.weekNoBookings": "No bookings",
    "mobile.profile": "Profile",
    "mobile.newBooking": "New booking",
    "mobile.newBookingNoticeTitle": "New booking",
    "mobile.newBookingNoticeDescription":
      "The booking creation form will be added in the next MVP step.",
    "mobile.newBookingNoticeClose": "Close",
    "mobile.manualBookingTitle": "New booking",
    "mobile.manualBookingDescription":
      "Create a confirmed booking for a client from your calendar or messages.",
    "mobile.manualBookingTimeDescription":
      "Start by choosing a service, date, and available time.",
    "mobile.manualBookingCustomerDescription":
      "Choose an existing customer or add a new one.",
    "mobile.manualBookingReviewDescription":
      "Review the booking details before creating it.",
    "mobile.manualBookingStepTime": "Time",
    "mobile.manualBookingStepCustomer": "Customer",
    "mobile.manualBookingStepReview": "Review",
    "mobile.manualBookingExistingCustomer": "Existing customer",
    "mobile.manualBookingNewCustomer": "New customer",
    "mobile.manualBookingSearchCustomer": "Search customers",
    "mobile.manualBookingNoCustomers": "No customers have been added yet.",
    "mobile.manualBookingCustomerName": "Customer name *",
    "mobile.manualBookingCustomerEmail": "Customer email",
    "mobile.manualBookingCustomerPhone": "Customer phone",
    "mobile.manualBookingService": "Service",
    "mobile.manualBookingDate": "Date *",
    "mobile.manualBookingTime": "Available time *",
    "mobile.manualBookingNoSlots": "There are no available times on this date.",
    "mobile.manualBookingDuration": "Duration in minutes *",
    "mobile.manualBookingPrice": "Price, Kč *",
    "mobile.manualBookingNote": "Master note",
    "mobile.manualBookingNotePlaceholder": "For example, client from Instagram",
    "mobile.manualBookingCreate": "Create booking",
    "mobile.manualBookingCreated": "Booking created",
    "mobile.manualBookingNameRequired": "Enter the customer name.",
    "mobile.manualBookingEmailInvalid": "Enter a valid email.",
    "mobile.manualBookingDateInvalid": "Choose a valid date.",
    "mobile.manualBookingTimeRequired": "Choose an available time.",
    "mobile.manualBookingDurationInvalid":
      "Duration must be between 1 and 1440 minutes.",
    "mobile.manualBookingPriceInvalid": "Price must be a non-negative number.",
    "mobile.manualBookingConflict":
      "This time is already taken. Refresh availability and choose another.",
    "mobile.manualBookingLoadFailed":
      "Customers or available times could not be loaded.",
    "mobile.bookings": "Bookings",
    "mobile.expectedRevenue": "Expected revenue",
    "mobile.finances": "Finances",
    "mobile.financeSummaryTitle": "Monthly overview",
    "mobile.financeIncome": "Booking amounts",
    "mobile.financeActual": "Received",
    "mobile.financeActualDescription": "Payment amount entered by the provider",
    "mobile.financeProfitUnavailable":
      "This is not profit: expenses are not included.",
    "mobile.financeAppointments": "Bookings",
    "mobile.financePreviousMonth": "Previous month",
    "mobile.financeNextMonth": "Next month",
    "mobile.financeExpected": "Expected",
    "mobile.financeExpectedDescription":
      "Upcoming bookings at service price; payment is not confirmed.",
    "mobile.financeCompletedAppointments": "Completed bookings",
    "mobile.financeUpcomingAppointments": "Upcoming bookings",
    "mobile.financeCanceledAppointments": "Canceled bookings",
    "mobile.financeNoShowAppointments": "No-shows",
    "mobile.financeEmpty": "There are no bookings for this month.",
    "mobile.financeLoadFailed": "Could not load the monthly overview.",
    "mobile.financeRetry": "Retry",
    "mobile.financeNewCustomers": "New customers",
    "mobile.financeReturningCustomers": "Returning customers",
    "mobile.financeBookedHours": "Booked hours",
    "mobile.paymentReceived": "Received for appointment",
    "mobile.paymentAmountHint": "Service price",
    "mobile.paymentAmountInvalid":
      "Enter an amount from 0 up to the service price (2 decimal places max).",
    "mobile.paymentSave": "Save payment",
    "mobile.paymentSaved": "Payment saved",
    "mobile.paymentSaveFailed": "Could not save payment.",
    "mobile.nextBooking": "Next booking",
    "mobile.noBookingsToday": "There are no bookings today.",
    "mobile.noBookingsOnDay": "There are no bookings for this date.",
    "mobile.daySchedule": "Day schedule",
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
    "mobile.personalBlockCreated": "Personal block added",
    "mobile.personalBlockDeleted": "Personal block deleted",
    "mobile.datePickerChoose": "Choose a date",
    "mobile.datePickerToday": "Today",
    "mobile.datePickerPreviousMonth": "Previous month",
    "mobile.datePickerNextMonth": "Next month",
    "mobile.services": "Services",
    "mobile.servicesDescription":
      "Manage the services, prices, and booking durations you offer.",
    "mobile.serviceAdd": "Add service",
    "mobile.serviceEdit": "Edit",
    "mobile.serviceArchive": "Archive",
    "mobile.serviceRestore": "Restore",
    "mobile.serviceEmpty": "No services have been added yet.",
    "mobile.serviceActive": "Active",
    "mobile.serviceArchived": "Archived",
    "mobile.serviceName": "Service name *",
    "mobile.serviceChoose": "Choose a service",
    "mobile.serviceSearch": "Search services",
    "mobile.serviceSearchEmpty": "No services found.",
    "mobile.serviceCategory": "Category",
    "mobile.serviceAllCategories": "All",
    "mobile.serviceUncategorized": "Uncategorized",
    "mobile.serviceDescription": "Description",
    "mobile.serviceDuration": "Duration in minutes *",
    "mobile.servicePrice": "Price *",
    "mobile.serviceCurrency": "Currency *",
    "mobile.serviceBufferBefore": "Buffer before, minutes",
    "mobile.serviceBufferAfter": "Buffer after, minutes",
    "mobile.serviceSortOrder": "Sort order",
    "mobile.serviceSave": "Save service",
    "mobile.serviceCreate": "Create service",
    "mobile.serviceArchiveConfirm":
      "The service will disappear from new bookings, but existing bookings will remain.",
    "mobile.serviceLoadFailed": "Services could not be loaded.",
    "mobile.serviceNameInvalid": "Enter a name up to 120 characters.",
    "mobile.serviceDurationInvalid":
      "Duration must be between 1 and 1440 minutes.",
    "mobile.servicePriceInvalid":
      "Price must be a number between 0 and 1,000,000.",
    "mobile.serviceCurrencyInvalid": "Use a three-letter currency code.",
    "mobile.serviceBufferInvalid":
      "Buffer must be a whole number between 0 and 240 minutes.",
    "mobile.serviceDescriptionInvalid":
      "Description must be 1,000 characters or fewer.",
    "mobile.serviceSortOrderInvalid":
      "Sort order must be a whole number between 0 and 100,000.",
    "mobile.signOut": "Sign out",
    "booking.description": "The online booking page is ready.",
    "booking.loadingContext": "Loading booking page…",
    "booking.unavailableTitle": "This booking page is unavailable",
    "booking.unavailableDescription":
      "The link may be incomplete or the page may be temporarily unavailable. Please ask the professional to share the current link.",
    "booking.unavailable": "We couldn't load this booking page.",
    "booking.availabilityFailed": "We couldn't check available times.",
    "booking.submitFailed":
      "We couldn't send your request. Check your connection and try again.",
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
    "booking.requestReceived": "Booking request sent",
    "booking.pendingConfirmation":
      "The professional needs to confirm this time. We'll show an update once the booking is confirmed.",
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
    "booking.manageUnavailableTitle": "This link is unavailable",
    "booking.manageUnavailable":
      "The link has expired or the appointment is no longer available. Ask the professional for a new link.",
    "booking.manageDescription": "Your appointment details",
    "booking.manageConfirm": "Confirm booking",
    "booking.manageCancel": "Cancel booking",
    "booking.managePending": "Awaiting confirmation",
    "booking.manageConfirmed": "Confirmed",
    "booking.manageCancelled": "Cancelled",
    "booking.manageCompleted": "Completed",
    "booking.manageActionFailed": "We couldn't update the booking. Try again.",
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

export type CompactDateOptions = {
  readonly timeZone?: string;
};

const defaultDateTimeZone = "Europe/Prague";

export function formatCompactDate(
  value: Date | number,
  locale: SupportedLocale,
  options: CompactDateOptions = {},
): string {
  const timeZone = options.timeZone ?? defaultDateTimeZone;
  const date = value instanceof Date ? value : new Date(value);

  return formatDate(date, locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
}

export function formatCompactDateRange(
  from: Date | number,
  to: Date | number,
  locale: SupportedLocale,
  options: CompactDateOptions = {},
): string {
  const timeZone = options.timeZone ?? defaultDateTimeZone;
  const fromDate = from instanceof Date ? from : new Date(from);
  const toDate = to instanceof Date ? to : new Date(to);
  const format = (date: Date) => {
    if (locale === "cz") {
      const day = formatDate(date, locale, { day: "numeric", timeZone });
      const month = formatDate(date, locale, { month: "short", timeZone });
      const year = formatDate(date, locale, { year: "numeric", timeZone });

      return `${day} ${month} ${year}`;
    }

    return formatDate(date, locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone,
    });
  };

  return `${format(fromDate)} – ${format(toDate)}`;
}

export function formatAccessibleDate(
  value: Date | number,
  locale: SupportedLocale,
  timeZone = defaultDateTimeZone,
): string {
  return formatDate(value, locale, {
    dateStyle: "full",
    timeZone,
  });
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
