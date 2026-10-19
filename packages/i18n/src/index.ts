import { slovakMessages } from "./locales/sk";
import { ukrainianMessages } from "./locales/uk";

export const supportedLocales = ["en", "cz", "sk", "ru", "uk"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const fallbackLocale: SupportedLocale = "en";
export const defaultLocale: SupportedLocale = "cz";

const intlLocales: Record<SupportedLocale, string> = {
  ru: "ru-RU",
  cz: "cs-CZ",
  en: "en-US",
  sk: "sk-SK",
  uk: "uk-UA",
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
  | "common.close"
  | "common.edit"
  | "common.delete"
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
  | "workspace.bookingIntervalLabel"
  | "workspace.bookingIntervalHelp"
  | "workspace.bookingInterval15"
  | "workspace.bookingInterval30"
  | "workspace.bookingInterval45"
  | "workspace.bookingInterval60"
  | "workspace.bookingInterval90"
  | "workspace.bookingIntervalCustom"
  | "workspace.bookingIntervalCustomLabel"
  | "workspace.bookingIntervalCustomPlaceholder"
  | "workspace.bookingIntervalCustomHelp"
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
  | "workspace.bookingIntervalInvalid"
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
  | "workspace.aiTranslationNotice"
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
  | "mobile.freeSlotsShareTab"
  | "mobile.freeSlotsBookTab"
  | "mobile.freeSlotsShareDescription"
  | "mobile.freeSlotsShareAvailabilityNote"
  | "mobile.freeSlotsShareAction"
  | "mobile.freeSlotsShareNoAvailability"
  | "mobile.freeSlotsShareFailed"
  | "mobile.freeSlotsShareOpened"
  | "mobile.freeSlotsShareDownloaded"
  | "mobile.freeSlotsSharePeriod"
  | "mobile.freeSlotsShareStartDate"
  | "mobile.freeSlotsShareEndDate"
  | "mobile.freeSlotsShareRangeLimit"
  | "mobile.freeSlotsShareInvalidRange"
  | "mobile.freeSlotsShareRangeTooLong"
  | "mobile.freeSlotsShareFormat"
  | "mobile.freeSlotsShareTextFormat"
  | "mobile.freeSlotsShareGraphicFormat"
  | "mobile.freeSlotsSharePreview"
  | "mobile.freeSlotsShareGraphicTitle"
  | "mobile.freeSlotsShareBookingLink"
  | "mobile.bookingRequests"
  | "mobile.waitingList"
  | "mobile.waitingListAdd"
  | "mobile.waitingListAddExisting"
  | "mobile.waitingListAddNew"
  | "mobile.waitingListEdit"
  | "mobile.waitingListCustomer"
  | "mobile.waitingListSearchCustomerLabel"
  | "mobile.waitingListSearchCustomer"
  | "mobile.waitingListCustomerName"
  | "mobile.waitingListSelectedCustomer"
  | "mobile.waitingListEmail"
  | "mobile.waitingListPhone"
  | "mobile.waitingListContactRequired"
  | "mobile.waitingListBookingPartialFailure"
  | "mobile.waitingListService"
  | "mobile.waitingListDate"
  | "mobile.waitingListFrom"
  | "mobile.waitingListTo"
  | "mobile.waitingListNote"
  | "mobile.waitingListEmpty"
  | "mobile.waitingListLoadFailed"
  | "mobile.waitingListStale"
  | "mobile.waitingListSaveFailed"
  | "mobile.waitingListDuplicateCustomer"
  | "mobile.waitingListRemoveAll"
  | "mobile.waitingListRemoveAllPrompt"
  | "mobile.waitingListRemoveAllConfirm"
  | "mobile.waitingListRemovePrompt"
  | "mobile.waitingListStatusActive"
  | "mobile.waitingListStatusBooked"
  | "mobile.waitingListStatusRemoved"
  | "mobile.waitingListMatches"
  | "mobile.waitingListMatchesDescription"
  | "mobile.waitingListMatchesEmpty"
  | "mobile.waitingListBook"
  | "mobile.bookingRequestsEmpty"
  | "mobile.bookingRequestsLoadFailed"
  | "mobile.bookingRequestAccept"
  | "mobile.bookingRequestDecline"
  | "mobile.bookingRequestDeclinePrompt"
  | "mobile.bookingRequestMoveToWaitingList"
  | "mobile.bookingRequestMoveToWaitingListPrompt"
  | "mobile.bookingRequestMoveToWaitingListConfirm"
  | "mobile.bookingRequestMovedToWaitingList"
  | "mobile.bookingRequestActionFailed"
  | "mobile.bookingRequestUpdated"
  | "mobile.bookingRequestEmailNotConfigured"
  | "mobile.minutes"
  | "mobile.available"
  | "mobile.pending"
  | "mobile.confirmed"
  | "mobile.statusCancelledByCustomer"
  | "mobile.statusCancelledByMaster"
  | "mobile.statusCompleted"
  | "mobile.statusNoShow"
  | "mobile.appointmentDetails"
  | "mobile.visitNote"
  | "mobile.visitNotePlaceholder"
  | "mobile.visitNoteSave"
  | "mobile.visitNoteSaved"
  | "mobile.visitNoteSaveFailed"
  | "mobile.recurringBooking"
  | "mobile.recurringBookingHint"
  | "mobile.recurringWeekly"
  | "mobile.recurringBiweekly"
  | "mobile.recurringOccurrenceCount"
  | "mobile.recurringCancelFuture"
  | "mobile.recurringCancelPrompt"
  | "mobile.recurringCancelAffectedTitle"
  | "mobile.recurringCancelNoFuture"
  | "mobile.recurringCancelPreviewFailed"
  | "mobile.recurringCancelRetry"
  | "mobile.recurringCancelConfirm"
  | "mobile.recurringCancelled"
  | "mobile.recurringCancelFailed"
  | "mobile.recurringByCount"
  | "mobile.recurringByDate"
  | "mobile.recurringEndDate"
  | "mobile.recurringInvalidEndDate"
  | "mobile.recurringPreviewFailed"
  | "mobile.recurringConflict"
  | "mobile.recurringSkipDate"
  | "mobile.recurringDateSkipped"
  | "mobile.appointmentStatus"
  | "mobile.appointmentStatusUpdated"
  | "mobile.appointmentDate"
  | "mobile.appointmentTime"
  | "mobile.appointmentService"
  | "mobile.appointmentPrice"
  | "mobile.appointmentContact"
  | "mobile.customerContactLoading"
  | "mobile.customerContactLoadFailed"
  | "mobile.customerCall"
  | "mobile.customerSms"
  | "mobile.customerContactActionFailed"
  | "mobile.confirmBooking"
  | "mobile.cancelBooking"
  | "mobile.cancelBookingConfirmDescription"
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
  | "mobile.todayLoadFailed"
  | "mobile.todayRetry"
  | "mobile.calendar"
  | "mobile.calendarSelectDate"
  | "mobile.calendarSelectDays"
  | "mobile.calendarSelectionHint"
  | "mobile.calendarCancelSelection"
  | "mobile.calendarSelectedDatesCount"
  | "mobile.calendarOpenClosedDays"
  | "mobile.calendarCloseOpenDays"
  | "mobile.calendarBulkOpenTitle"
  | "mobile.calendarBulkCloseTitle"
  | "mobile.calendarBulkOpenDescription"
  | "mobile.calendarBulkCloseDescription"
  | "mobile.calendarBulkConflictSummary"
  | "mobile.calendarBulkSaveFailed"
  | "mobile.calendarBulkInvalidHours"
  | "mobile.calendarBulkApply"
  | "mobile.calendarBulkAppliedDates"
  | "mobile.customers"
  | "mobile.customerSearch"
  | "mobile.openCustomerDetails"
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
  | "mobile.customerNoteShowMore"
  | "mobile.customerNoteShowLess"
  | "mobile.customerNote"
  | "mobile.customerDelete"
  | "mobile.customerDeleteConfirm"
  | "mobile.customerDeleteConfirmAction"
  | "mobile.customerDeleteCancel"
  | "mobile.customerDeleteSaving"
  | "mobile.customerDeleteFailed"
  | "mobile.customerBooking"
  | "mobile.customerVisitCount"
  | "mobile.calendarClosed"
  | "mobile.calendarClosedDescription"
  | "mobile.calendarDaySettings"
  | "mobile.calendarDaySettingsDescription"
  | "mobile.calendarDayOpen"
  | "mobile.calendarDayClose"
  | "mobile.calendarDayStart"
  | "mobile.calendarDayEnd"
  | "mobile.calendarDayConflictCount"
  | "mobile.calendarDayConflictDescription"
  | "mobile.calendarDaySaveFailed"
  | "mobile.calendarDayInvalidHours"
  | "mobile.calendarDaySave"
  | "mobile.calendarDayReset"
  | "mobile.calendarDayClosedStatus"
  | "mobile.calendarDayWorkingHours"
  | "mobile.calendarDayResetDone"
  | "mobile.calendarDayClosedSaved"
  | "mobile.calendarDayHoursSaved"
  | "mobile.calendarPrevious"
  | "mobile.calendarNext"
  | "mobile.calendarPreviousWeek"
  | "mobile.calendarNextWeek"
  | "mobile.calendarTapToBook"
  | "mobile.calendarChooseTime"
  | "mobile.calendarBookingTab"
  | "mobile.calendarBreakTab"
  | "mobile.calendarDayView"
  | "mobile.calendarWeekView"
  | "mobile.calendarMonthView"
  | "mobile.calendarPreviousMonth"
  | "mobile.calendarNextMonth"
  | "mobile.monthBookings"
  | "mobile.monthBlocks"
  | "mobile.monthNoBookings"
  | "mobile.weekBookings"
  | "mobile.weekNoBookings"
  | "mobile.calendarWorkload"
  | "mobile.calendarLoadLow"
  | "mobile.calendarLoadMedium"
  | "mobile.calendarLoadHigh"
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
  | "mobile.manualBookingSearchHint"
  | "mobile.manualBookingNoCustomers"
  | "mobile.manualBookingCustomerName"
  | "mobile.manualBookingCustomerEmail"
  | "mobile.manualBookingCustomerPhone"
  | "mobile.manualBookingService"
  | "mobile.manualBookingServices"
  | "mobile.manualBookingAddService"
  | "mobile.manualBookingMoveServiceUp"
  | "mobile.manualBookingMoveServiceDown"
  | "mobile.manualBookingRemoveService"
  | "mobile.manualBookingNoServicesSelected"
  | "mobile.manualBookingServicesRequired"
  | "mobile.manualBookingServiceLimitReached"
  | "mobile.manualBookingCurrencyMismatch"
  | "mobile.manualBookingTotal"
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
  | "mobile.receivedRevenue"
  | "mobile.finances"
  | "mobile.financeSummaryTitle"
  | "mobile.financeIncome"
  | "mobile.financeActual"
  | "mobile.financeActualDescription"
  | "mobile.financeProfitUnavailable"
  | "mobile.financeShowDetails"
  | "mobile.financeHideDetails"
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
  | "mobile.financeWeeklyIncome"
  | "mobile.financeNoReceivedIncome"
  | "mobile.profileWorkingDays"
  | "mobile.profileBookingInterval"
  | "mobile.profileOpenBooking"
  | "mobile.paymentReceived"
  | "mobile.paymentAmountHint"
  | "mobile.paymentAmountInvalid"
  | "mobile.paymentSave"
  | "mobile.paymentSaved"
  | "mobile.paymentSaveFailed"
  | "mobile.nextBooking"
  | "mobile.calendarManualBooking"
  | "mobile.calendarOnlineBooking"
  | "mobile.calendarBreak"
  | "mobile.noBookingsToday"
  | "mobile.noBookingsOnDay"
  | "mobile.daySchedule"
  | "mobile.firstService"
  | "mobile.noServices"
  | "mobile.workingHours"
  | "mobile.publicBookingLink"
  | "mobile.publicBookingDescription"
  | "mobile.settings"
  | "mobile.personalBlocks"
  | "mobile.personalBlockEmpty"
  | "mobile.personalBlockTitle"
  | "mobile.personalBlockEditTitle"
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
  | "mobile.personalBlockSaveChanges"
  | "mobile.personalBlockAdd"
  | "mobile.personalBlockDelete"
  | "mobile.personalBlockDeleteConfirm"
  | "mobile.personalBlockOverlap"
  | "mobile.personalBlockCreated"
  | "mobile.personalBlockUpdated"
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
  | "mobile.serviceSearchClear"
  | "mobile.serviceSearchEmpty"
  | "mobile.serviceFiltersClear"
  | "mobile.serviceCategory"
  | "mobile.serviceCategoryHint"
  | "mobile.serviceCategoryPlaceholder"
  | "mobile.serviceAllCategories"
  | "mobile.serviceUncategorized"
  | "mobile.serviceArchiveEmpty"
  | "mobile.serviceDescription"
  | "mobile.serviceDuration"
  | "mobile.servicePrice"
  | "mobile.serviceCurrency"
  | "mobile.serviceBufferBefore"
  | "mobile.serviceBufferAfter"
  | "mobile.serviceSortOrder"
  | "mobile.serviceSourceLanguage"
  | "mobile.serviceTranslationReviewHint"
  | "mobile.serviceTranslationQuotaWarning"
  | "mobile.serviceTranslationQuotaExceeded"
  | "mobile.serviceTranslateWithAi"
  | "mobile.serviceTranslationLoading"
  | "mobile.serviceTranslationFailed"
  | "mobile.serviceTranslationNameRequired"
  | "mobile.serviceTranslationsShow"
  | "mobile.serviceTranslationsHide"
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
  | "booking.searchServices"
  | "booking.selectedServices"
  | "booking.removeService"
  | "booking.remove"
  | "booking.totalDuration"
  | "booking.totalPrice"
  | "booking.categoryOther"
  | "booking.noMatchingServices"
  | "booking.noServices"
  | "booking.slotNoLongerAvailable"
  | "booking.chooseDate"
  | "booking.chooseTime"
  | "booking.yourDetails"
  | "booking.name"
  | "booking.email"
  | "booking.emailRequired"
  | "booking.emailInvalid"
  | "booking.emailNotificationNotice"
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
  | "booking.manageCancelPrompt"
  | "booking.manageCancelConfirm"
  | "booking.manageKeepBooking"
  | "booking.managePending"
  | "booking.manageConfirmed"
  | "booking.manageCancelled"
  | "booking.manageCompleted"
  | "booking.manageActionFailed";

export type Messages = Record<MessageKey, string>;

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
    "common.close": "Закрыть",
    "common.edit": "Изменить",
    "common.delete": "Удалить",
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
    "workspace.bookingIntervalLabel": "Шаг начала записи",
    "workspace.bookingIntervalHelp":
      "Выберите, как часто показывать варианты времени. Длительность задаётся отдельно у каждой услуги.",
    "workspace.bookingInterval15": "Каждые 15 мин",
    "workspace.bookingInterval30": "Каждые 30 мин",
    "workspace.bookingInterval45": "Каждые 45 мин",
    "workspace.bookingInterval60": "Каждые 60 мин",
    "workspace.bookingInterval90": "Каждые 90 мин",
    "workspace.bookingIntervalCustom": "Другой шаг",
    "workspace.bookingIntervalCustomLabel": "Шаг записи в минутах",
    "workspace.bookingIntervalCustomPlaceholder": "От 5 до 420 минут",
    "workspace.bookingIntervalCustomHelp":
      "Укажите значение, кратное 5 минутам (от 5 до 420).",
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
    "workspace.bookingIntervalInvalid":
      "Укажите шаг от 5 до 420 минут, кратный 5.",
    "workspace.workingDaysInvalid": "Выберите хотя бы один рабочий день.",
    "workspace.scheduleInvalid":
      "Введите время в формате ЧЧ:ММ. Конец дня должен быть позже начала.",
    "workspace.setupSaving": "Сохранение…",
    "workspace.setupSave": "Сохранить и продолжить",
    "workspace.settingsTitle": "Рабочее пространство",
    "workspace.settingsDescription":
      "Измените название, ссылку, рабочие часы и шаг начала записи.",
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
    "workspace.aiTranslationNotice":
      "Позже приложение сможет предложить переводы услуги с помощью ИИ. Это только черновики: ИИ может ошибиться, поэтому проверьте и при необходимости измените перевод перед сохранением.",
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
    "mobile.freeSlotsShareTab": "Поделиться",
    "mobile.freeSlotsBookTab": "Найти и записать",
    "mobile.freeSlotsShareDescription": "Свободное время на ближайшие 14 дней.",
    "mobile.freeSlotsShareAvailabilityNote":
      "Время начала зависит от выбранной услуги.",
    "mobile.freeSlotsShareAction": "Поделиться расписанием",
    "mobile.freeSlotsShareNoAvailability":
      "В ближайшие 14 дней нет свободных окон.",
    "mobile.freeSlotsShareFailed": "Не удалось открыть меню отправки.",
    "mobile.freeSlotsShareOpened":
      "Выберите приложение, чтобы отправить расписание.",
    "mobile.freeSlotsShareDownloaded":
      "Изображение скачано. Теперь его можно отправить через приложение для сообщений.",
    "mobile.freeSlotsSharePeriod": "Период публикации",
    "mobile.freeSlotsShareStartDate": "С даты",
    "mobile.freeSlotsShareEndDate": "По дату",
    "mobile.freeSlotsShareRangeLimit": "Можно выбрать период до 90 дней.",
    "mobile.freeSlotsShareInvalidRange":
      "Дата окончания не может быть раньше даты начала.",
    "mobile.freeSlotsShareRangeTooLong":
      "Период не может быть длиннее 90 дней.",
    "mobile.freeSlotsShareFormat": "Формат",
    "mobile.freeSlotsShareTextFormat": "Текст",
    "mobile.freeSlotsShareGraphicFormat": "Изображение",
    "mobile.freeSlotsSharePreview": "Предпросмотр",
    "mobile.freeSlotsShareGraphicTitle": "Свободное время для записи",
    "mobile.freeSlotsShareBookingLink": "Запись онлайн",
    "mobile.bookingRequests": "Заявки",
    "mobile.waitingList": "Лист ожидания",
    "mobile.waitingListAdd": "Добавить в лист ожидания",
    "mobile.waitingListAddExisting": "Добавить существующего клиента",
    "mobile.waitingListAddNew": "Создать нового клиента",
    "mobile.waitingListEdit": "Запись в листе ожидания",
    "mobile.waitingListCustomer": "Клиент или новый контакт",
    "mobile.waitingListSearchCustomerLabel": "Поиск клиента",
    "mobile.waitingListSearchCustomer":
      "Введите имя, телефон или email для поиска клиента",
    "mobile.waitingListCustomerName": "Имя клиента",
    "mobile.waitingListSelectedCustomer": "Выбран клиент: {name}",
    "mobile.waitingListEmail": "Email клиента",
    "mobile.waitingListPhone": "Телефон клиента",
    "mobile.waitingListContactRequired":
      "Для нового контакта укажите email или телефон.",
    "mobile.waitingListBookingPartialFailure":
      "Запись создана, но статус в листе ожидания не обновлён. Проверьте список.",
    "mobile.waitingListService": "Услуга",
    "mobile.waitingListDate": "Желаемая дата",
    "mobile.waitingListFrom": "Время с",
    "mobile.waitingListTo": "Время до",
    "mobile.waitingListNote": "Заметка",
    "mobile.waitingListEmpty": "Лист ожидания пока пуст.",
    "mobile.waitingListLoadFailed": "Не удалось загрузить лист ожидания.",
    "mobile.waitingListStale":
      "Не удалось обновить. Показаны последние загруженные данные.",
    "mobile.waitingListSaveFailed": "Не удалось сохранить изменения.",
    "mobile.waitingListDuplicateCustomer":
      "Клиент с таким email или телефоном уже существует. Найдите и выберите его в списке.",
    "mobile.waitingListRemoveAll": "Удалить все",
    "mobile.waitingListRemoveAllPrompt":
      "Удалить все активные записи ({count})? Их история сохранится.",
    "mobile.waitingListRemoveAllConfirm": "Удалить все записи",
    "mobile.waitingListRemovePrompt": "Удалить {name} из листа ожидания?",
    "mobile.waitingListStatusActive": "Ожидает",
    "mobile.waitingListStatusBooked": "Записан",
    "mobile.waitingListStatusRemoved": "Удалён",
    "mobile.waitingListMatches": "Клиенты из листа ожидания",
    "mobile.waitingListMatchesDescription":
      "Эти клиенты выбрали ту же услугу и подходят по времени. Выберите клиента и подтвердите свободный слот.",
    "mobile.waitingListMatchesEmpty":
      "Подходящих клиентов для этого времени нет.",
    "mobile.waitingListBook": "Записать клиента",
    "mobile.bookingRequestsEmpty": "Новых заявок пока нет.",
    "mobile.bookingRequestsLoadFailed":
      "Не удалось загрузить заявки. Попробуйте ещё раз.",
    "mobile.bookingRequestAccept": "Подтвердить",
    "mobile.bookingRequestDecline": "Отклонить",
    "mobile.bookingRequestDeclinePrompt": "Отклонить эту заявку?",
    "mobile.bookingRequestMoveToWaitingList": "В лист ожидания",
    "mobile.bookingRequestMoveToWaitingListPrompt":
      "Заявка будет отклонена, а клиент и услуга добавлены в лист ожидания.",
    "mobile.bookingRequestMoveToWaitingListConfirm": "Перенести",
    "mobile.bookingRequestMovedToWaitingList":
      "Заявка отклонена, клиент добавлен в лист ожидания.",
    "mobile.bookingRequestActionFailed":
      "Не удалось обновить заявку. Возможно, её статус уже изменился. Обновите список.",
    "mobile.bookingRequestUpdated": "Решение по заявке сохранено.",
    "mobile.bookingRequestEmailNotConfigured":
      "Решение сохранено, но email-доставка пока не настроена. Клиент не получит уведомление, пока ее не включат.",
    "mobile.minutes": "мин",
    "mobile.available": "Свободно",
    "mobile.pending": "Ожидает подтверждения",
    "mobile.confirmed": "Подтверждено",
    "mobile.statusCancelledByCustomer": "Отменено клиентом",
    "mobile.statusCancelledByMaster": "Отменено мастером",
    "mobile.statusCompleted": "Завершено",
    "mobile.statusNoShow": "Клиент не пришёл",
    "mobile.appointmentDetails": "Детали записи",
    "mobile.visitNote": "Заметка к визиту",
    "mobile.visitNotePlaceholder": "Добавьте заметку для следующего визита",
    "mobile.visitNoteSave": "Сохранить заметку",
    "mobile.visitNoteSaved": "Заметка сохранена",
    "mobile.visitNoteSaveFailed": "Не удалось сохранить заметку.",
    "mobile.recurringBooking": "Повторять запись",
    "mobile.recurringBookingHint":
      "Создадим отдельные записи. Максимум — 24 посещения; каждое время проверяется на доступность.",
    "mobile.recurringWeekly": "Каждую неделю",
    "mobile.recurringBiweekly": "Раз в 2 недели",
    "mobile.recurringOccurrenceCount": "Всего посещений (2–24)",
    "mobile.recurringCancelFuture": "Отменить будущие записи серии",
    "mobile.recurringCancelPrompt":
      "Будут отменены только будущие ожидающие подтверждения и подтверждённые записи серии. Завершённые визиты останутся в истории.",
    "mobile.recurringCancelAffectedTitle": "Будут отменены:",
    "mobile.recurringCancelNoFuture": "Будущих записей для отмены нет.",
    "mobile.recurringCancelPreviewFailed":
      "Не удалось загрузить список записей. Повторите попытку перед отменой.",
    "mobile.recurringCancelRetry": "Загрузить ещё раз",
    "mobile.recurringCancelConfirm": "Отменить будущие записи",
    "mobile.recurringCancelled": "Будущие записи серии отменены",
    "mobile.recurringCancelFailed": "Не удалось отменить серию записей.",
    "mobile.recurringByCount": "По числу посещений",
    "mobile.recurringByDate": "До даты",
    "mobile.recurringEndDate": "Последняя дата серии",
    "mobile.recurringInvalidEndDate":
      "Дата окончания должна включать минимум два посещения.",
    "mobile.recurringPreviewFailed":
      "Не удалось проверить доступность повторов. Попробуйте изменить время или повторить загрузку.",
    "mobile.recurringConflict": "Это время занято или день закрыт.",
    "mobile.recurringSkipDate": "Пропустить дату",
    "mobile.recurringDateSkipped": "Дата пропущена",
    "mobile.appointmentStatus": "Статус",
    "mobile.appointmentStatusUpdated": "Статус записи обновлён",
    "mobile.appointmentDate": "Дата",
    "mobile.appointmentTime": "Время",
    "mobile.appointmentService": "Услуга",
    "mobile.appointmentPrice": "Стоимость",
    "mobile.appointmentContact": "Связь с клиентом",
    "mobile.customerContactLoading": "Загружаем номер телефона…",
    "mobile.customerContactLoadFailed": "Не удалось загрузить контакт клиента.",
    "mobile.customerCall": "Позвонить",
    "mobile.customerSms": "Написать SMS",
    "mobile.customerContactActionFailed":
      "Не удалось открыть приложение для связи.",
    "mobile.confirmBooking": "Подтвердить запись",
    "mobile.cancelBooking": "Отменить запись",
    "mobile.cancelBookingConfirmDescription":
      "Вы уверены, что хотите отменить эту запись?",
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
    "mobile.todayLoadFailed": "Не удалось загрузить расписание.",
    "mobile.todayRetry": "Повторить",
    "mobile.calendar": "Календарь",
    "mobile.calendarSelectDate": "Выберите дату",
    "mobile.calendarSelectDays": "Выбрать даты",
    "mobile.calendarSelectionHint":
      "Нажимайте на даты, чтобы добавить или убрать их из выбора.",
    "mobile.calendarCancelSelection": "Отменить выбор",
    "mobile.calendarSelectedDatesCount": "Выбрано дат: {count}",
    "mobile.calendarOpenClosedDays": "Открыть выходные: {count}",
    "mobile.calendarCloseOpenDays": "Закрыть рабочие: {count}",
    "mobile.calendarBulkOpenTitle": "Открыть выбранные дни",
    "mobile.calendarBulkCloseTitle": "Закрыть выбранные дни",
    "mobile.calendarBulkOpenDescription":
      "Задайте одинаковые рабочие часы для всех выбранных выходных.",
    "mobile.calendarBulkCloseDescription":
      "Будут закрыты только выбранные даты. Недельный график не изменится.",
    "mobile.calendarBulkConflictSummary":
      "Даты: {dates}. Записей, которые сохранятся без изменений: {count}.",
    "mobile.calendarBulkSaveFailed": "Не удалось изменить выбранные дни.",
    "mobile.calendarBulkInvalidHours":
      "Укажите конец рабочего времени позже начала.",
    "mobile.calendarBulkApply": "Применить изменения",
    "mobile.calendarBulkAppliedDates": "Обработаны даты: {dates}",
    "mobile.customers": "Клиенты",
    "mobile.customerSearch": "Имя, телефон или email",
    "mobile.openCustomerDetails": "Открыть профиль клиента",
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
    "mobile.customerNoteShowMore": "Показать полностью",
    "mobile.customerNoteShowLess": "Свернуть заметку",
    "mobile.customerNote": "Заметка мастера",
    "mobile.customerDelete": "Удалить клиента",
    "mobile.customerDeleteConfirm":
      "Контактные данные и заметки клиента будут удалены. История записей и финансовые суммы останутся в обезличенном виде.",
    "mobile.customerDeleteConfirmAction": "Удалить данные",
    "mobile.customerDeleteCancel": "Оставить клиента",
    "mobile.customerDeleteSaving": "Удаляем данные…",
    "mobile.customerDeleteFailed":
      "Не удалось удалить данные клиента. Попробуйте ещё раз.",
    "mobile.customerBooking": "Создать запись",
    "mobile.customerVisitCount": "Завершённых визитов",
    "mobile.calendarClosed": "Нерабочий день",
    "mobile.calendarClosedDescription":
      "На этот день рабочие часы не настроены.",
    "mobile.calendarDaySettings": "Настроить день",
    "mobile.calendarDaySettingsDescription":
      "Изменение действует только на выбранную дату и не меняет недельный график.",
    "mobile.calendarDayOpen": "Рабочие часы",
    "mobile.calendarDayClose": "Выходной",
    "mobile.calendarDayStart": "Начало работы",
    "mobile.calendarDayEnd": "Конец работы",
    "mobile.calendarDayConflictCount": "Конфликтующих записей: {count}",
    "mobile.calendarDayConflictDescription":
      "Эти записи сохранятся без изменений. Доступность новых записей будет соответствовать выбранному графику.",
    "mobile.calendarDaySaveFailed": "Не удалось сохранить график дня.",
    "mobile.calendarDayInvalidHours":
      "Укажите конец рабочего времени позже начала.",
    "mobile.calendarDaySave": "Сохранить",
    "mobile.calendarDayReset": "Вернуть недельный график",
    "mobile.calendarDayClosedStatus": "Выходной",
    "mobile.calendarDayWorkingHours": "Рабочее время",
    "mobile.calendarDayResetDone": "Недельный график восстановлен",
    "mobile.calendarDayClosedSaved": "День закрыт для бронирования",
    "mobile.calendarDayHoursSaved": "Рабочее время обновлено",
    "mobile.calendarPrevious": "Предыдущая дата",
    "mobile.calendarNext": "Следующая дата",
    "mobile.calendarPreviousWeek": "Предыдущая неделя",
    "mobile.calendarNextWeek": "Следующая неделя",
    "mobile.calendarTapToBook": "Нажмите, чтобы создать запись",
    "mobile.calendarChooseTime": "Выберите время начала",
    "mobile.calendarBookingTab": "Запись",
    "mobile.calendarBreakTab": "Перерыв",
    "mobile.calendarDayView": "День",
    "mobile.calendarWeekView": "Неделя",
    "mobile.calendarMonthView": "Месяц",
    "mobile.calendarPreviousMonth": "Предыдущий месяц",
    "mobile.calendarNextMonth": "Следующий месяц",
    "mobile.monthBookings": "записей",
    "mobile.monthBlocks": "блоков",
    "mobile.monthNoBookings": "Нет записей",
    "mobile.weekBookings": "записей",
    "mobile.weekNoBookings": "Нет записей",
    "mobile.calendarWorkload": "загрузка",
    "mobile.calendarLoadLow": "низкая <30%",
    "mobile.calendarLoadMedium": "средняя 30–69%",
    "mobile.calendarLoadHigh": "высокая ≥70%",
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
    "mobile.manualBookingSearchHint":
      "Введите имя, телефон или e-mail клиента — покажем только совпадения.",
    "mobile.manualBookingNoCustomers": "Клиенты пока не добавлены.",
    "mobile.manualBookingCustomerName": "Имя клиента *",
    "mobile.manualBookingCustomerEmail": "Email клиента",
    "mobile.manualBookingCustomerPhone": "Телефон клиента",
    "mobile.manualBookingService": "Услуги",
    "mobile.manualBookingServices": "Услуги *",
    "mobile.manualBookingAddService": "Добавить услугу",
    "mobile.manualBookingMoveServiceUp": "Переместить услугу выше",
    "mobile.manualBookingMoveServiceDown": "Переместить услугу ниже",
    "mobile.manualBookingRemoveService": "Убрать услугу",
    "mobile.manualBookingNoServicesSelected":
      "Выберите одну или несколько услуг.",
    "mobile.manualBookingServicesRequired": "Выберите хотя бы одну услугу.",
    "mobile.manualBookingServiceLimitReached":
      "В одной записи можно выбрать не более 20 услуг.",
    "mobile.manualBookingCurrencyMismatch":
      "В одной записи можно объединить услуги только в одной валюте.",
    "mobile.manualBookingTotal": "итого",
    "mobile.manualBookingDate": "Дата *",
    "mobile.manualBookingTime": "Свободное время *",
    "mobile.manualBookingNoSlots": "На эту дату нет свободных окон.",
    "mobile.manualBookingDuration": "Длительность записи",
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
    "mobile.receivedRevenue": "Получено",
    "mobile.finances": "Финансы",
    "mobile.financeSummaryTitle": "Сводка за месяц",
    "mobile.financeIncome": "Сумма по записям",
    "mobile.financeActual": "Получено",
    "mobile.financeActualDescription": "Сумма оплаты, указанная мастером",
    "mobile.financeProfitUnavailable":
      "Это не прибыль: расходы здесь не учитываются.",
    "mobile.financeShowDetails": "Показать подробности",
    "mobile.financeHideDetails": "Скрыть подробности",
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
    "mobile.financeWeeklyIncome": "Доход по неделям",
    "mobile.financeNoReceivedIncome": "Полученных оплат пока нет.",
    "mobile.profileWorkingDays": "Рабочих дней в неделю: {count}",
    "mobile.profileBookingInterval": "Шаг записи: {minutes} мин",
    "mobile.profileOpenBooking": "Открыть страницу записи",
    "mobile.paymentReceived": "Получено за запись",
    "mobile.paymentAmountHint": "Цена услуги",
    "mobile.paymentAmountInvalid":
      "Введите сумму от 0 до 99 999 999,99 (до 2 знаков после запятой).",
    "mobile.paymentSave": "Сохранить оплату",
    "mobile.paymentSaved": "Оплата сохранена",
    "mobile.paymentSaveFailed": "Не удалось сохранить оплату.",
    "mobile.nextBooking": "Следующая запись",
    "mobile.calendarManualBooking": "Запись мастера",
    "mobile.calendarOnlineBooking": "Онлайн-запись",
    "mobile.calendarBreak": "Перерыв",
    "mobile.noBookingsToday": "На сегодня записей нет.",
    "mobile.noBookingsOnDay": "На эту дату записей нет.",
    "mobile.daySchedule": "Расписание дня",
    "mobile.firstService": "Первая услуга",
    "mobile.noServices": "Активных услуг пока нет.",
    "mobile.workingHours": "Рабочие часы",
    "mobile.publicBookingLink": "Публичная ссылка на запись",
    "mobile.publicBookingDescription":
      "Клиенты могут выбрать услугу и свободное время.",
    "mobile.settings": "Настройки",
    "mobile.personalBlocks": "Личные блоки",
    "mobile.personalBlockEmpty": "Личных блоков на ближайшие дни нет.",
    "mobile.personalBlockTitle": "Закрыть время",
    "mobile.personalBlockEditTitle": "Изменить паузу",
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
    "mobile.personalBlockSaveChanges": "Сохранить изменения",
    "mobile.personalBlockAdd": "Добавить перерыв",
    "mobile.personalBlockDelete": "Удалить",
    "mobile.personalBlockDeleteConfirm":
      "Пауза будет удалена, и это время снова станет доступно для записи.",
    "mobile.personalBlockOverlap":
      "Это время пересекается с существующей записью или блоком.",
    "mobile.personalBlockCreated": "Личный блок добавлен",
    "mobile.personalBlockUpdated": "Пауза обновлена",
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
    "mobile.serviceArchiveEmpty": "Архив услуг пуст.",
    "mobile.serviceActive": "Активные",
    "mobile.serviceArchived": "Архив",
    "mobile.serviceName": "Название услуги *",
    "mobile.serviceChoose": "Выберите услугу",
    "mobile.serviceSearch": "Поиск по названию, описанию или категории",
    "mobile.serviceSearchClear": "Очистить поиск",
    "mobile.serviceSearchEmpty": "Услуги не найдены.",
    "mobile.serviceFiltersClear": "Сбросить фильтры",
    "mobile.serviceCategory": "Категория",
    "mobile.serviceCategoryHint":
      "Выберите существующую или введите новую категорию.",
    "mobile.serviceCategoryPlaceholder": "Например, Маникюр",
    "mobile.serviceAllCategories": "Все",
    "mobile.serviceUncategorized": "Без категории",
    "mobile.serviceDescription": "Описание",
    "mobile.serviceDuration": "Длительность, минут *",
    "mobile.servicePrice": "Цена *",
    "mobile.serviceCurrency": "Валюта *",
    "mobile.serviceBufferBefore": "Перерыв до, минут",
    "mobile.serviceBufferAfter": "Перерыв после, минут",
    "mobile.serviceSortOrder": "Порядок",
    "mobile.serviceSourceLanguage": "Язык исходного названия",
    "mobile.serviceTranslationReviewHint":
      "ИИ может ошибиться или неверно передать смысл. Проверьте каждый перевод и при необходимости исправьте его перед сохранением. Название, описание и категория отправляются в OpenAI; использование API может оплачиваться отдельно.",
    "mobile.serviceTranslationQuotaWarning":
      "Осталось {remaining} из {limit} бесплатных генераций ИИ-перевода на этот месяц для рабочего пространства.",
    "mobile.serviceTranslationQuotaExceeded":
      "Месячный бесплатный лимит генераций ИИ-перевода исчерпан. Он обновится в начале следующего месяца.",
    "mobile.serviceTranslateWithAi": "Предложить перевод с помощью ИИ",
    "mobile.serviceTranslationLoading": "Готовим переводы…",
    "mobile.serviceTranslationFailed":
      "Не удалось подготовить перевод. Попробуйте ещё раз.",
    "mobile.serviceTranslationNameRequired": "Сначала введите название услуги.",
    "mobile.serviceTranslationsShow": "Добавить переводы вручную",
    "mobile.serviceTranslationsHide": "Скрыть переводы",
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
    "booking.searchServices": "Поиск по названию или категории",
    "booking.selectedServices": "Выбранные услуги",
    "booking.removeService": "Убрать {name}",
    "booking.remove": "Убрать",
    "booking.totalDuration": "Общее время",
    "booking.totalPrice": "Итого",
    "booking.categoryOther": "Без категории",
    "booking.noMatchingServices": "Ничего не найдено. Измените запрос.",
    "booking.noServices": "Пока нет доступных услуг для записи.",
    "booking.slotNoLongerAvailable":
      "Это время уже заняли. Выберите другой свободный интервал.",
    "booking.chooseDate": "Выберите дату",
    "booking.chooseTime": "Выберите время",
    "booking.yourDetails": "Ваши данные",
    "booking.name": "Имя",
    "booking.email": "Email",
    "booking.emailRequired": "Укажите email, чтобы отправить заявку.",
    "booking.emailInvalid": "Введите корректный email.",
    "booking.emailNotificationNotice":
      "На этот адрес придет письмо, когда мастер примет решение по заявке. Рекламных писем не будет.",
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
      "Поля со знаком * обязательны. Email нужен, чтобы получить ответ мастера; телефон можно не указывать.",
    "booking.optional": "необязательно",
    "booking.manageUnavailableTitle": "Ссылка недействительна",
    "booking.manageUnavailable":
      "Срок ссылки истёк или запись больше недоступна. Попросите мастера прислать новую ссылку.",
    "booking.manageDescription": "Детали вашей записи",
    "booking.manageConfirm": "Подтвердить запись",
    "booking.manageCancel": "Отменить запись",
    "booking.manageCancelPrompt":
      "Вы уверены, что хотите отменить запись? Это действие нельзя будет отменить.",
    "booking.manageCancelConfirm": "Подтвердить отмену",
    "booking.manageKeepBooking": "Оставить запись",
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
    "common.close": "Zavřít",
    "common.edit": "Upravit",
    "common.delete": "Smazat",
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
    "workspace.bookingIntervalLabel": "Krok začátku rezervace",
    "workspace.bookingIntervalHelp":
      "Určuje, jak často se zobrazí možné časy. Délka se nastavuje zvlášť u každé služby.",
    "workspace.bookingInterval15": "Každých 15 min",
    "workspace.bookingInterval30": "Každých 30 min",
    "workspace.bookingInterval45": "Každých 45 min",
    "workspace.bookingInterval60": "Každých 60 min",
    "workspace.bookingInterval90": "Každých 90 min",
    "workspace.bookingIntervalCustom": "Vlastní krok",
    "workspace.bookingIntervalCustomLabel": "Krok rezervace v minutách",
    "workspace.bookingIntervalCustomPlaceholder": "Od 5 do 420 minut",
    "workspace.bookingIntervalCustomHelp":
      "Zadejte hodnotu v násobcích 5 minut (od 5 do 420).",
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
    "workspace.bookingIntervalInvalid":
      "Zadejte krok od 5 do 420 minut, který je násobkem 5.",
    "workspace.workingDaysInvalid": "Vyberte alespoň jeden pracovní den.",
    "workspace.scheduleInvalid":
      "Zadejte čas ve formátu HH:MM. Konec musí být později než začátek.",
    "workspace.setupSaving": "Ukládání…",
    "workspace.setupSave": "Uložit a pokračovat",
    "workspace.settingsTitle": "Pracovní prostor",
    "workspace.settingsDescription":
      "Upravte název, odkaz, pracovní dobu a krok začátku rezervace.",
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
    "workspace.aiTranslationNotice":
      "Později vám aplikace může nabídnout překlady služeb pomocí AI. Jde pouze o návrhy: AI se může mýlit, proto překlad před uložením zkontrolujte a případně upravte.",
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
    "mobile.freeSlotsShareTab": "Sdílet",
    "mobile.freeSlotsBookTab": "Najít a objednat",
    "mobile.freeSlotsShareDescription": "Volné termíny na příštích 14 dní.",
    "mobile.freeSlotsShareAvailabilityNote":
      "Čas začátku závisí na vybrané službě.",
    "mobile.freeSlotsShareAction": "Sdílet rozvrh",
    "mobile.freeSlotsShareNoAvailability":
      "V příštích 14 dnech nejsou volné termíny.",
    "mobile.freeSlotsShareFailed": "Nabídku sdílení se nepodařilo otevřít.",
    "mobile.freeSlotsShareOpened": "Vyberte aplikaci pro odeslání rozvrhu.",
    "mobile.freeSlotsShareDownloaded":
      "Obrázek se stáhl. Nyní ho můžete poslat přes aplikaci pro zprávy.",
    "mobile.freeSlotsSharePeriod": "Období sdílení",
    "mobile.freeSlotsShareStartDate": "Od data",
    "mobile.freeSlotsShareEndDate": "Do data",
    "mobile.freeSlotsShareRangeLimit": "Lze vybrat období až 90 dnů.",
    "mobile.freeSlotsShareInvalidRange":
      "Datum konce nesmí být před datem začátku.",
    "mobile.freeSlotsShareRangeTooLong": "Období nesmí být delší než 90 dnů.",
    "mobile.freeSlotsShareFormat": "Formát",
    "mobile.freeSlotsShareTextFormat": "Text",
    "mobile.freeSlotsShareGraphicFormat": "Obrázek",
    "mobile.freeSlotsSharePreview": "Náhled",
    "mobile.freeSlotsShareGraphicTitle": "Volné časy k objednání",
    "mobile.freeSlotsShareBookingLink": "Online rezervace",
    "mobile.bookingRequests": "Žádosti",
    "mobile.waitingList": "Seznam náhradníků",
    "mobile.waitingListAdd": "Přidat do seznamu náhradníků",
    "mobile.waitingListAddExisting": "Přidat stávajícího klienta",
    "mobile.waitingListAddNew": "Vytvořit nového klienta",
    "mobile.waitingListEdit": "Záznam v seznamu náhradníků",
    "mobile.waitingListCustomer": "Klient nebo nový kontakt",
    "mobile.waitingListSearchCustomerLabel": "Vyhledat klienta",
    "mobile.waitingListSearchCustomer":
      "Zadejte jméno, telefon nebo e-mail a vyhledejte klienta",
    "mobile.waitingListCustomerName": "Jméno klienta",
    "mobile.waitingListSelectedCustomer": "Vybraný klient: {name}",
    "mobile.waitingListEmail": "E-mail klienta",
    "mobile.waitingListPhone": "Telefon klienta",
    "mobile.waitingListContactRequired":
      "U nového kontaktu vyplňte e-mail nebo telefon.",
    "mobile.waitingListBookingPartialFailure":
      "Objednávka byla vytvořena, ale stav v seznamu náhradníků nebyl aktualizován. Zkontrolujte seznam.",
    "mobile.waitingListService": "Služba",
    "mobile.waitingListDate": "Požadované datum",
    "mobile.waitingListFrom": "Čas od",
    "mobile.waitingListTo": "Čas do",
    "mobile.waitingListNote": "Poznámka",
    "mobile.waitingListEmpty": "Seznam náhradníků je zatím prázdný.",
    "mobile.waitingListLoadFailed": "Seznam náhradníků se nepodařilo načíst.",
    "mobile.waitingListStale":
      "Aktualizace se nezdařila. Zobrazuji poslední načtené údaje.",
    "mobile.waitingListSaveFailed": "Změny se nepodařilo uložit.",
    "mobile.waitingListDuplicateCustomer":
      "Klient s tímto e-mailem nebo telefonem již existuje. Najděte ho a vyberte ze seznamu.",
    "mobile.waitingListRemoveAll": "Odebrat všechny",
    "mobile.waitingListRemoveAllPrompt":
      "Odebrat všechny aktivní záznamy ({count})? Historie zůstane zachována.",
    "mobile.waitingListRemoveAllConfirm": "Odebrat všechny záznamy",
    "mobile.waitingListRemovePrompt":
      "Odebrat klienta {name} ze seznamu náhradníků?",
    "mobile.waitingListStatusActive": "Čeká",
    "mobile.waitingListStatusBooked": "Objednán",
    "mobile.waitingListStatusRemoved": "Odebrán",
    "mobile.waitingListMatches": "Klienti ze seznamu náhradníků",
    "mobile.waitingListMatchesDescription":
      "Tito klienti zvolili stejnou službu a vyhovuje jim čas. Vyberte klienta a potvrďte volný termín.",
    "mobile.waitingListMatchesEmpty": "Pro tento termín nejsou vhodní klienti.",
    "mobile.waitingListBook": "Objednat klienta",
    "mobile.bookingRequestsEmpty": "Zatím tu nejsou žádné nové žádosti.",
    "mobile.bookingRequestsLoadFailed":
      "Žádosti se nepodařilo načíst. Zkuste to znovu.",
    "mobile.bookingRequestAccept": "Potvrdit",
    "mobile.bookingRequestDecline": "Odmítnout",
    "mobile.bookingRequestDeclinePrompt": "Odmítnout tuto žádost?",
    "mobile.bookingRequestMoveToWaitingList": "Do seznamu náhradníků",
    "mobile.bookingRequestMoveToWaitingListPrompt":
      "Žádost bude odmítnuta a klient se službou přidán do seznamu náhradníků.",
    "mobile.bookingRequestMoveToWaitingListConfirm": "Přesunout",
    "mobile.bookingRequestMovedToWaitingList":
      "Žádost byla odmítnuta a klient přidán do seznamu náhradníků.",
    "mobile.bookingRequestActionFailed":
      "Žádost se nepodařilo aktualizovat. Její stav se možná změnil. Obnovte seznam.",
    "mobile.bookingRequestUpdated": "Rozhodnutí o žádosti bylo uloženo.",
    "mobile.bookingRequestEmailNotConfigured":
      "Rozhodnutí bylo uloženo, ale e-mailové doručování zatím není nastaveno. Klient oznámení nedostane, dokud nebude zapnuto.",
    "mobile.minutes": "min",
    "mobile.available": "Volno",
    "mobile.pending": "Čeká na potvrzení",
    "mobile.confirmed": "Potvrzeno",
    "mobile.statusCancelledByCustomer": "Zrušeno klientem",
    "mobile.statusCancelledByMaster": "Zrušeno mistrem",
    "mobile.statusCompleted": "Dokončeno",
    "mobile.statusNoShow": "Klient nepřišel",
    "mobile.appointmentDetails": "Detail rezervace",
    "mobile.visitNote": "Poznámka k návštěvě",
    "mobile.visitNotePlaceholder": "Přidejte poznámku pro další návštěvu",
    "mobile.visitNoteSave": "Uložit poznámku",
    "mobile.visitNoteSaved": "Poznámka byla uložena",
    "mobile.visitNoteSaveFailed": "Poznámku se nepodařilo uložit.",
    "mobile.recurringBooking": "Opakovat rezervaci",
    "mobile.recurringBookingHint":
      "Vytvoříme samostatné rezervace. Nejvýše 24 návštěv; dostupnost ověříme pro každý termín.",
    "mobile.recurringWeekly": "Každý týden",
    "mobile.recurringBiweekly": "Každé 2 týdny",
    "mobile.recurringOccurrenceCount": "Celkem návštěv (2–24)",
    "mobile.recurringCancelFuture": "Zrušit budoucí rezervace série",
    "mobile.recurringCancelPrompt":
      "Zruší se pouze budoucí čekající a potvrzené rezervace série. Dokončené návštěvy zůstanou v historii.",
    "mobile.recurringCancelAffectedTitle": "Budou zrušeny:",
    "mobile.recurringCancelNoFuture":
      "Nejsou žádné budoucí rezervace ke zrušení.",
    "mobile.recurringCancelPreviewFailed":
      "Seznam rezervací se nepodařilo načíst. Před zrušením to zkuste znovu.",
    "mobile.recurringCancelRetry": "Načíst znovu",
    "mobile.recurringCancelConfirm": "Zrušit budoucí rezervace",
    "mobile.recurringCancelled": "Budoucí rezervace série byly zrušeny",
    "mobile.recurringCancelFailed": "Sérii rezervací se nepodařilo zrušit.",
    "mobile.recurringByCount": "Podle počtu návštěv",
    "mobile.recurringByDate": "Do data",
    "mobile.recurringEndDate": "Poslední datum série",
    "mobile.recurringInvalidEndDate":
      "Datum ukončení musí zahrnovat alespoň dvě návštěvy.",
    "mobile.recurringPreviewFailed":
      "Dostupnost opakovaných termínů se nepodařilo ověřit. Zkuste změnit čas nebo načtení zopakovat.",
    "mobile.recurringConflict": "Tento čas je obsazený nebo je den zavřený.",
    "mobile.recurringSkipDate": "Přeskočit datum",
    "mobile.recurringDateSkipped": "Datum přeskočeno",
    "mobile.appointmentStatus": "Stav",
    "mobile.appointmentStatusUpdated": "Stav rezervace byl aktualizován",
    "mobile.appointmentDate": "Datum",
    "mobile.appointmentTime": "Čas",
    "mobile.appointmentService": "Služba",
    "mobile.appointmentPrice": "Cena",
    "mobile.appointmentContact": "Kontakt na klienta",
    "mobile.customerContactLoading": "Načítání telefonního čísla…",
    "mobile.customerContactLoadFailed": "Kontakt klienta se nepodařilo načíst.",
    "mobile.customerCall": "Zavolat",
    "mobile.customerSms": "Napsat SMS",
    "mobile.customerContactActionFailed":
      "Aplikaci pro kontakt se nepodařilo otevřít.",
    "mobile.confirmBooking": "Potvrdit rezervaci",
    "mobile.cancelBooking": "Zrušit rezervaci",
    "mobile.cancelBookingConfirmDescription":
      "Opravdu chcete tuto rezervaci zrušit?",
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
    "mobile.todayLoadFailed": "Nepodařilo se načíst rozvrh.",
    "mobile.todayRetry": "Zkusit znovu",
    "mobile.calendar": "Kalendář",
    "mobile.calendarSelectDate": "Vyberte datum",
    "mobile.calendarSelectDays": "Vybrat dny",
    "mobile.calendarSelectionHint":
      "Klepnutím na data je přidáte do výběru nebo z něj odeberete.",
    "mobile.calendarCancelSelection": "Zrušit výběr",
    "mobile.calendarSelectedDatesCount": "Vybraná data: {count}",
    "mobile.calendarOpenClosedDays": "Otevřít volné dny: {count}",
    "mobile.calendarCloseOpenDays": "Uzavřít pracovní dny: {count}",
    "mobile.calendarBulkOpenTitle": "Otevřít vybrané dny",
    "mobile.calendarBulkCloseTitle": "Uzavřít vybrané dny",
    "mobile.calendarBulkOpenDescription":
      "Nastavte stejnou pracovní dobu pro všechny vybrané volné dny.",
    "mobile.calendarBulkCloseDescription":
      "Uzavřou se pouze vybraná data. Týdenní rozvrh zůstane beze změny.",
    "mobile.calendarBulkConflictSummary":
      "Data: {dates}. Rezervace, které zůstanou beze změny: {count}.",
    "mobile.calendarBulkSaveFailed": "Vybrané dny se nepodařilo upravit.",
    "mobile.calendarBulkInvalidHours":
      "Konec pracovní doby musí být později než její začátek.",
    "mobile.calendarBulkApply": "Použít změny",
    "mobile.calendarBulkAppliedDates": "Zpracovaná data: {dates}",
    "mobile.customers": "Klienti",
    "mobile.customerSearch": "Jméno, telefon nebo e-mail",
    "mobile.openCustomerDetails": "Otevřít profil klienta",
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
    "mobile.customerNoteShowMore": "Zobrazit celé",
    "mobile.customerNoteShowLess": "Skrýt poznámku",
    "mobile.customerNote": "Poznámka mistra",
    "mobile.customerDelete": "Odstranit klienta",
    "mobile.customerDeleteConfirm":
      "Kontaktní údaje a poznámky klienta budou odstraněny. Historie rezervací a finanční součty zůstanou anonymizované.",
    "mobile.customerDeleteConfirmAction": "Odstranit údaje",
    "mobile.customerDeleteCancel": "Ponechat klienta",
    "mobile.customerDeleteSaving": "Odstraňuji údaje…",
    "mobile.customerDeleteFailed":
      "Údaje klienta se nepodařilo odstranit. Zkuste to znovu.",
    "mobile.customerBooking": "Vytvořit rezervaci",
    "mobile.customerVisitCount": "Dokončené návštěvy",
    "mobile.calendarClosed": "Nepracovní den",
    "mobile.calendarClosedDescription":
      "Pro tento den nejsou nastavené pracovní hodiny.",
    "mobile.calendarDaySettings": "Nastavit den",
    "mobile.calendarDaySettingsDescription":
      "Změna platí pouze pro vybrané datum a nemění týdenní rozvrh.",
    "mobile.calendarDayOpen": "Pracovní doba",
    "mobile.calendarDayClose": "Volno",
    "mobile.calendarDayStart": "Začátek práce",
    "mobile.calendarDayEnd": "Konec práce",
    "mobile.calendarDayConflictCount": "Rezervace v konfliktu: {count}",
    "mobile.calendarDayConflictDescription":
      "Tyto rezervace zůstanou beze změny. Dostupnost nových rezervací bude odpovídat zvolenému rozvrhu.",
    "mobile.calendarDaySaveFailed": "Pracovní dobu se nepodařilo uložit.",
    "mobile.calendarDayInvalidHours":
      "Zadejte konec pracovní doby po jejím začátku.",
    "mobile.calendarDaySave": "Uložit",
    "mobile.calendarDayReset": "Obnovit týdenní rozvrh",
    "mobile.calendarDayClosedStatus": "Volno",
    "mobile.calendarDayWorkingHours": "Pracovní doba",
    "mobile.calendarDayResetDone": "Týdenní rozvrh byl obnoven",
    "mobile.calendarDayClosedSaved": "Den byl uzavřen pro rezervace",
    "mobile.calendarDayHoursSaved": "Pracovní doba byla aktualizována",
    "mobile.calendarPrevious": "Předchozí datum",
    "mobile.calendarNext": "Následující datum",
    "mobile.calendarPreviousWeek": "Předchozí týden",
    "mobile.calendarNextWeek": "Následující týden",
    "mobile.calendarTapToBook": "Klepnutím vytvoříte rezervaci",
    "mobile.calendarChooseTime": "Vyberte čas začátku",
    "mobile.calendarBookingTab": "Rezervace",
    "mobile.calendarBreakTab": "Přestávka",
    "mobile.calendarDayView": "Den",
    "mobile.calendarWeekView": "Týden",
    "mobile.calendarMonthView": "Měsíc",
    "mobile.calendarPreviousMonth": "Předchozí měsíc",
    "mobile.calendarNextMonth": "Následující měsíc",
    "mobile.monthBookings": "rezervací",
    "mobile.monthBlocks": "bloků",
    "mobile.monthNoBookings": "Žádné rezervace",
    "mobile.weekBookings": "rezervací",
    "mobile.weekNoBookings": "Žádné rezervace",
    "mobile.calendarWorkload": "vytížení",
    "mobile.calendarLoadLow": "nízké <30 %",
    "mobile.calendarLoadMedium": "střední 30–69 %",
    "mobile.calendarLoadHigh": "vysoké ≥70 %",
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
    "mobile.manualBookingSearchHint":
      "Zadejte jméno, telefon nebo e-mail klienta. Zobrazíme pouze shody.",
    "mobile.manualBookingNoCustomers": "Zatím nemáte žádné klienty.",
    "mobile.manualBookingCustomerName": "Jméno klienta *",
    "mobile.manualBookingCustomerEmail": "E-mail klienta",
    "mobile.manualBookingCustomerPhone": "Telefon klienta",
    "mobile.manualBookingService": "Služby",
    "mobile.manualBookingServices": "Služby *",
    "mobile.manualBookingAddService": "Přidat službu",
    "mobile.manualBookingMoveServiceUp": "Posunout službu výše",
    "mobile.manualBookingMoveServiceDown": "Posunout službu níže",
    "mobile.manualBookingRemoveService": "Odebrat službu",
    "mobile.manualBookingNoServicesSelected": "Vyberte jednu nebo více služeb.",
    "mobile.manualBookingServicesRequired": "Vyberte alespoň jednu službu.",
    "mobile.manualBookingServiceLimitReached":
      "V jedné rezervaci lze vybrat nejvýše 20 služeb.",
    "mobile.manualBookingCurrencyMismatch":
      "V jedné rezervaci lze kombinovat pouze služby ve stejné měně.",
    "mobile.manualBookingTotal": "celkem",
    "mobile.manualBookingDate": "Datum *",
    "mobile.manualBookingTime": "Volný termín *",
    "mobile.manualBookingNoSlots": "Pro toto datum nejsou volné termíny.",
    "mobile.manualBookingDuration": "Délka rezervace",
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
    "mobile.receivedRevenue": "Přijato",
    "mobile.finances": "Finance",
    "mobile.financeSummaryTitle": "Měsíční přehled",
    "mobile.financeIncome": "Částky podle rezervací",
    "mobile.financeActual": "Přijato",
    "mobile.financeActualDescription": "Částka platby zadaná poskytovatelem",
    "mobile.financeProfitUnavailable":
      "Nejde o zisk: výdaje se zde nezohledňují.",
    "mobile.financeShowDetails": "Zobrazit podrobnosti",
    "mobile.financeHideDetails": "Skrýt podrobnosti",
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
    "mobile.financeWeeklyIncome": "Příjem po týdnech",
    "mobile.financeNoReceivedIncome": "Zatím nebyly přijaty žádné platby.",
    "mobile.profileWorkingDays": "Pracovní dny v týdnu: {count}",
    "mobile.profileBookingInterval": "Krok rezervace: {minutes} min",
    "mobile.profileOpenBooking": "Otevřít rezervační stránku",
    "mobile.paymentReceived": "Přijato za rezervaci",
    "mobile.paymentAmountHint": "Cena služby",
    "mobile.paymentAmountInvalid":
      "Zadejte částku od 0 do 99 999 999,99 (max. 2 desetinná místa).",
    "mobile.paymentSave": "Uložit platbu",
    "mobile.paymentSaved": "Platba uložena",
    "mobile.paymentSaveFailed": "Platbu se nepodařilo uložit.",
    "mobile.nextBooking": "Další rezervace",
    "mobile.calendarManualBooking": "Rezervace od vás",
    "mobile.calendarOnlineBooking": "Online rezervace",
    "mobile.calendarBreak": "Přestávka",
    "mobile.noBookingsToday": "Na dnešek nemáte žádné rezervace.",
    "mobile.noBookingsOnDay": "Na tento den nejsou žádné rezervace.",
    "mobile.daySchedule": "Denní rozvrh",
    "mobile.firstService": "První služba",
    "mobile.noServices": "Zatím nemáte žádné aktivní služby.",
    "mobile.workingHours": "Pracovní doba",
    "mobile.publicBookingLink": "Veřejný odkaz pro rezervace",
    "mobile.publicBookingDescription":
      "Klienti si mohou vybrat službu a volný termín.",
    "mobile.settings": "Nastavení",
    "mobile.personalBlocks": "Osobní bloky",
    "mobile.personalBlockEmpty": "Na nejbližší dny nemáte žádné osobní bloky.",
    "mobile.personalBlockTitle": "Uzavřít čas",
    "mobile.personalBlockEditTitle": "Upravit přestávku",
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
    "mobile.personalBlockSaveChanges": "Uložit změny",
    "mobile.personalBlockAdd": "Přidat pauzu",
    "mobile.personalBlockDelete": "Smazat",
    "mobile.personalBlockDeleteConfirm":
      "Přestávka bude odstraněna a tento čas bude znovu dostupný pro rezervace.",
    "mobile.personalBlockOverlap":
      "Čas se překrývá s existující rezervací nebo blokem.",
    "mobile.personalBlockCreated": "Osobní blok byl přidán",
    "mobile.personalBlockUpdated": "Přestávka byla upravena",
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
    "mobile.serviceArchiveEmpty": "Archiv služeb je prázdný.",
    "mobile.serviceActive": "Aktivní",
    "mobile.serviceArchived": "Archiv",
    "mobile.serviceName": "Název služby *",
    "mobile.serviceChoose": "Vyberte službu",
    "mobile.serviceSearch": "Hledat podle názvu, popisu nebo kategorie",
    "mobile.serviceSearchClear": "Vymazat hledání",
    "mobile.serviceSearchEmpty": "Žádné služby nebyly nalezeny.",
    "mobile.serviceFiltersClear": "Zrušit filtry",
    "mobile.serviceCategory": "Kategorie",
    "mobile.serviceCategoryHint":
      "Vyberte existující kategorii nebo zadejte novou.",
    "mobile.serviceCategoryPlaceholder": "Například manikúra",
    "mobile.serviceAllCategories": "Vše",
    "mobile.serviceUncategorized": "Bez kategorie",
    "mobile.serviceDescription": "Popis",
    "mobile.serviceDuration": "Délka v minutách *",
    "mobile.servicePrice": "Cena *",
    "mobile.serviceCurrency": "Měna *",
    "mobile.serviceBufferBefore": "Pauza před, minuty",
    "mobile.serviceBufferAfter": "Pauza po, minuty",
    "mobile.serviceSortOrder": "Pořadí",
    "mobile.serviceSourceLanguage": "Jazyk původního názvu",
    "mobile.serviceTranslationReviewHint":
      "AI se může mýlit nebo změnit význam. Každý překlad před uložením zkontrolujte a případně upravte. Název, popis a kategorie se odesílají službě OpenAI; používání API může být zpoplatněno zvlášť.",
    "mobile.serviceTranslationQuotaWarning":
      "Pro tento pracovní prostor zbývá na tento měsíc {remaining} z {limit} bezplatných generování AI překladů.",
    "mobile.serviceTranslationQuotaExceeded":
      "Měsíční bezplatný limit generování AI překladů byl vyčerpán. Obnoví se na začátku příštího měsíce.",
    "mobile.serviceTranslateWithAi": "Navrhnout překlad pomocí AI",
    "mobile.serviceTranslationLoading": "Připravují se překlady…",
    "mobile.serviceTranslationFailed":
      "Překlad se nepodařilo připravit. Zkuste to znovu.",
    "mobile.serviceTranslationNameRequired": "Nejprve zadejte název služby.",
    "mobile.serviceTranslationsShow": "Zadat překlady ručně",
    "mobile.serviceTranslationsHide": "Skrýt překlady",
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
    "booking.searchServices": "Hľadať podľa názvu alebo kategórie",
    "booking.selectedServices": "Vybrané služby",
    "booking.removeService": "Odstrániť: {name}",
    "booking.remove": "Odstranit",
    "booking.totalDuration": "Celkový čas",
    "booking.totalPrice": "Spolu",
    "booking.categoryOther": "Bez kategórie",
    "booking.noMatchingServices": "Nič sa nenašlo. Upravte vyhľadávanie.",
    "booking.noServices": "Momentálne nie sú dostupné žiadne služby.",
    "booking.slotNoLongerAvailable":
      "Tento čas už nie je voľný. Vyberte si iný termín.",
    "booking.chooseDate": "Vyberte datum",
    "booking.chooseTime": "Vyberte čas",
    "booking.yourDetails": "Vaše údaje",
    "booking.name": "Jméno",
    "booking.email": "E-mail",
    "booking.emailRequired": "Zadejte e-mail pro odeslání žádosti.",
    "booking.emailInvalid": "Zadejte platný e-mail.",
    "booking.emailNotificationNotice":
      "Na tuto adresu vám pošleme zprávu, až mistr rozhodne o žádosti. Reklamní e-maily neposíláme.",
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
      "Pole označená * jsou povinná. E-mail potřebujeme, abychom vám oznámili rozhodnutí mistra; telefon je nepovinný.",
    "booking.optional": "nepovinné",
    "booking.manageUnavailableTitle": "Odkaz není platný",
    "booking.manageUnavailable":
      "Odkaz vypršel nebo rezervace již není dostupná. Požádejte mistra o nový odkaz.",
    "booking.manageDescription": "Podrobnosti rezervace",
    "booking.manageConfirm": "Potvrdit rezervaci",
    "booking.manageCancel": "Zrušit rezervaci",
    "booking.manageCancelPrompt":
      "Opravdu chcete rezervaci zrušit? Tuto akci nelze vrátit.",
    "booking.manageCancelConfirm": "Potvrdit zrušení",
    "booking.manageKeepBooking": "Ponechat rezervaci",
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
    "common.close": "Close",
    "common.edit": "Edit",
    "common.delete": "Delete",
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
    "workspace.bookingIntervalLabel": "Booking start interval",
    "workspace.bookingIntervalHelp":
      "Choose how often start times are offered. Service duration is set separately for each service.",
    "workspace.bookingInterval15": "Every 15 min",
    "workspace.bookingInterval30": "Every 30 min",
    "workspace.bookingInterval45": "Every 45 min",
    "workspace.bookingInterval60": "Every 60 min",
    "workspace.bookingInterval90": "Every 90 min",
    "workspace.bookingIntervalCustom": "Custom step",
    "workspace.bookingIntervalCustomLabel": "Booking step in minutes",
    "workspace.bookingIntervalCustomPlaceholder": "From 5 to 420 minutes",
    "workspace.bookingIntervalCustomHelp":
      "Enter a value in 5-minute increments (from 5 to 420).",
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
    "workspace.bookingIntervalInvalid":
      "Enter a step from 5 to 420 minutes in 5-minute increments.",
    "workspace.workingDaysInvalid": "Choose at least one working day.",
    "workspace.scheduleInvalid":
      "Enter time in HH:MM format. The end must be after the start.",
    "workspace.setupSaving": "Saving…",
    "workspace.setupSave": "Save and continue",
    "workspace.settingsTitle": "Workspace settings",
    "workspace.settingsDescription":
      "Update the workspace name, booking link, working hours, and booking start interval.",
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
    "workspace.aiTranslationNotice":
      "Later, the app can suggest AI translations for your service. These are drafts only: AI can make mistakes, so review and edit each translation before saving.",
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
    "mobile.freeSlotsShareTab": "Share",
    "mobile.freeSlotsBookTab": "Find & book",
    "mobile.freeSlotsShareDescription": "Available times for the next 14 days.",
    "mobile.freeSlotsShareAvailabilityNote":
      "Start times depend on the service selected.",
    "mobile.freeSlotsShareAction": "Share schedule",
    "mobile.freeSlotsShareNoAvailability":
      "No times are available in the next 14 days.",
    "mobile.freeSlotsShareFailed": "Couldn't open the share menu.",
    "mobile.freeSlotsShareOpened": "Choose an app to send the schedule.",
    "mobile.freeSlotsShareDownloaded":
      "Image downloaded. You can now send it from your messaging app.",
    "mobile.freeSlotsSharePeriod": "Sharing period",
    "mobile.freeSlotsShareStartDate": "From date",
    "mobile.freeSlotsShareEndDate": "To date",
    "mobile.freeSlotsShareRangeLimit": "Choose a period of up to 90 days.",
    "mobile.freeSlotsShareInvalidRange":
      "The end date must be on or after the start date.",
    "mobile.freeSlotsShareRangeTooLong":
      "The period cannot be longer than 90 days.",
    "mobile.freeSlotsShareFormat": "Format",
    "mobile.freeSlotsShareTextFormat": "Text",
    "mobile.freeSlotsShareGraphicFormat": "Image",
    "mobile.freeSlotsSharePreview": "Preview",
    "mobile.freeSlotsShareGraphicTitle": "Available appointment times",
    "mobile.freeSlotsShareBookingLink": "Book online",
    "mobile.bookingRequests": "Requests",
    "mobile.waitingList": "Waiting list",
    "mobile.waitingListAdd": "Add to waiting list",
    "mobile.waitingListAddExisting": "Add existing client",
    "mobile.waitingListAddNew": "Create new client",
    "mobile.waitingListEdit": "Waiting list entry",
    "mobile.waitingListCustomer": "Customer or new contact",
    "mobile.waitingListSearchCustomerLabel": "Search for a client",
    "mobile.waitingListSearchCustomer":
      "Enter a name, phone, or email to search for a client",
    "mobile.waitingListCustomerName": "Customer name",
    "mobile.waitingListSelectedCustomer": "Selected client: {name}",
    "mobile.waitingListEmail": "Customer email",
    "mobile.waitingListPhone": "Customer phone",
    "mobile.waitingListContactRequired":
      "Add an email or phone number for a new contact.",
    "mobile.waitingListBookingPartialFailure":
      "The appointment was created, but the waiting list status wasn't updated. Check the list.",
    "mobile.waitingListService": "Service",
    "mobile.waitingListDate": "Preferred date",
    "mobile.waitingListFrom": "Time from",
    "mobile.waitingListTo": "Time to",
    "mobile.waitingListNote": "Note",
    "mobile.waitingListEmpty": "The waiting list is empty.",
    "mobile.waitingListLoadFailed": "Couldn't load the waiting list.",
    "mobile.waitingListStale":
      "Couldn't refresh. Showing the last loaded data.",
    "mobile.waitingListSaveFailed": "Couldn't save the changes.",
    "mobile.waitingListDuplicateCustomer":
      "A client with this email or phone already exists. Find and select them from the list.",
    "mobile.waitingListRemoveAll": "Remove all",
    "mobile.waitingListRemoveAllPrompt":
      "Remove all {count} active entries? Their history will remain.",
    "mobile.waitingListRemoveAllConfirm": "Remove all entries",
    "mobile.waitingListRemovePrompt": "Remove {name} from the waiting list?",
    "mobile.waitingListStatusActive": "Waiting",
    "mobile.waitingListStatusBooked": "Booked",
    "mobile.waitingListStatusRemoved": "Removed",
    "mobile.waitingListMatches": "Waiting list matches",
    "mobile.waitingListMatchesDescription":
      "These clients chose the same service and match this time. Select a client and confirm the available slot.",
    "mobile.waitingListMatchesEmpty": "No clients match this time.",
    "mobile.waitingListBook": "Book client",
    "mobile.bookingRequestsEmpty": "There are no new requests yet.",
    "mobile.bookingRequestsLoadFailed":
      "Couldn't load requests. Please try again.",
    "mobile.bookingRequestAccept": "Confirm",
    "mobile.bookingRequestDecline": "Decline",
    "mobile.bookingRequestDeclinePrompt": "Decline this request?",
    "mobile.bookingRequestMoveToWaitingList": "Move to waiting list",
    "mobile.bookingRequestMoveToWaitingListPrompt":
      "This request will be declined, and the client and service added to the waiting list.",
    "mobile.bookingRequestMoveToWaitingListConfirm": "Move",
    "mobile.bookingRequestMovedToWaitingList":
      "Request declined and client added to the waiting list.",
    "mobile.bookingRequestActionFailed":
      "Couldn't update the request. Its status may have changed. Refresh the list.",
    "mobile.bookingRequestUpdated": "Your decision was saved.",
    "mobile.bookingRequestEmailNotConfigured":
      "Your decision was saved, but email delivery is not configured yet. The client will not receive a notification until it is enabled.",
    "mobile.minutes": "min",
    "mobile.available": "Available",
    "mobile.pending": "Pending confirmation",
    "mobile.confirmed": "Confirmed",
    "mobile.statusCancelledByCustomer": "Cancelled by customer",
    "mobile.statusCancelledByMaster": "Cancelled by master",
    "mobile.statusCompleted": "Completed",
    "mobile.statusNoShow": "No-show",
    "mobile.appointmentDetails": "Appointment details",
    "mobile.visitNote": "Visit note",
    "mobile.visitNotePlaceholder": "Add a note for the next visit",
    "mobile.visitNoteSave": "Save note",
    "mobile.visitNoteSaved": "Note saved",
    "mobile.visitNoteSaveFailed": "Could not save the note.",
    "mobile.recurringBooking": "Repeat appointment",
    "mobile.recurringBookingHint":
      "We’ll create separate appointments. Up to 24 visits; availability is checked for each date.",
    "mobile.recurringWeekly": "Every week",
    "mobile.recurringBiweekly": "Every 2 weeks",
    "mobile.recurringOccurrenceCount": "Total visits (2–24)",
    "mobile.recurringCancelFuture": "Cancel future appointments in series",
    "mobile.recurringCancelPrompt":
      "Only future pending and confirmed appointments in this series will be cancelled. Completed visits stay in history.",
    "mobile.recurringCancelAffectedTitle": "Appointments to be cancelled:",
    "mobile.recurringCancelNoFuture":
      "There are no future appointments to cancel.",
    "mobile.recurringCancelPreviewFailed":
      "Could not load the appointment list. Retry before cancelling.",
    "mobile.recurringCancelRetry": "Try again",
    "mobile.recurringCancelConfirm": "Cancel future appointments",
    "mobile.recurringCancelled": "Future appointments in the series cancelled",
    "mobile.recurringCancelFailed": "Could not cancel the appointment series.",
    "mobile.recurringByCount": "By number of visits",
    "mobile.recurringByDate": "Until date",
    "mobile.recurringEndDate": "Last date in series",
    "mobile.recurringInvalidEndDate":
      "The end date must include at least two visits.",
    "mobile.recurringPreviewFailed":
      "Could not check availability for repeats. Try changing the time or reload the preview.",
    "mobile.recurringConflict": "This time is occupied or the day is closed.",
    "mobile.recurringSkipDate": "Skip date",
    "mobile.recurringDateSkipped": "Date skipped",
    "mobile.appointmentStatus": "Status",
    "mobile.appointmentStatusUpdated": "Booking status updated",
    "mobile.appointmentDate": "Date",
    "mobile.appointmentTime": "Time",
    "mobile.appointmentService": "Service",
    "mobile.appointmentPrice": "Price",
    "mobile.appointmentContact": "Contact customer",
    "mobile.customerContactLoading": "Loading phone number…",
    "mobile.customerContactLoadFailed":
      "Could not load the customer's contact.",
    "mobile.customerCall": "Call",
    "mobile.customerSms": "Text by SMS",
    "mobile.customerContactActionFailed": "Could not open the contact app.",
    "mobile.confirmBooking": "Confirm booking",
    "mobile.cancelBooking": "Cancel booking",
    "mobile.cancelBookingConfirmDescription":
      "Are you sure you want to cancel this appointment?",
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
    "mobile.todayLoadFailed": "The schedule could not be loaded.",
    "mobile.todayRetry": "Try again",
    "mobile.calendar": "Calendar",
    "mobile.calendarSelectDate": "Choose a date",
    "mobile.calendarSelectDays": "Select dates",
    "mobile.calendarSelectionHint":
      "Tap dates to add or remove them from your selection.",
    "mobile.calendarCancelSelection": "Cancel selection",
    "mobile.calendarSelectedDatesCount": "Dates selected: {count}",
    "mobile.calendarOpenClosedDays": "Open days off: {count}",
    "mobile.calendarCloseOpenDays": "Close working days: {count}",
    "mobile.calendarBulkOpenTitle": "Open selected days",
    "mobile.calendarBulkCloseTitle": "Close selected days",
    "mobile.calendarBulkOpenDescription":
      "Set the same working hours for all selected days off.",
    "mobile.calendarBulkCloseDescription":
      "Only the selected dates will close. Your weekly schedule stays unchanged.",
    "mobile.calendarBulkConflictSummary":
      "Dates: {dates}. Bookings that will stay unchanged: {count}.",
    "mobile.calendarBulkSaveFailed": "Could not update the selected days.",
    "mobile.calendarBulkInvalidHours":
      "Set the end of the work period after its start.",
    "mobile.calendarBulkApply": "Apply changes",
    "mobile.calendarBulkAppliedDates": "Dates processed: {dates}",
    "mobile.customers": "Customers",
    "mobile.customerSearch": "Name, phone, or email",
    "mobile.openCustomerDetails": "Open customer profile",
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
    "mobile.customerNoteShowMore": "Show full note",
    "mobile.customerNoteShowLess": "Collapse note",
    "mobile.customerNote": "Master's note",
    "mobile.customerDelete": "Delete customer",
    "mobile.customerDeleteConfirm":
      "The customer's contact details and notes will be removed. Appointment history and financial totals will remain anonymized.",
    "mobile.customerDeleteConfirmAction": "Delete data",
    "mobile.customerDeleteCancel": "Keep customer",
    "mobile.customerDeleteSaving": "Removing data…",
    "mobile.customerDeleteFailed":
      "Could not remove the customer's data. Please try again.",
    "mobile.customerBooking": "Create booking",
    "mobile.customerVisitCount": "Completed visits",
    "mobile.calendarClosed": "Closed day",
    "mobile.calendarClosedDescription":
      "Working hours are not configured for this day.",
    "mobile.calendarDaySettings": "Configure day",
    "mobile.calendarDaySettingsDescription":
      "This change applies only to the selected date and does not change the weekly schedule.",
    "mobile.calendarDayOpen": "Working hours",
    "mobile.calendarDayClose": "Day off",
    "mobile.calendarDayStart": "Work starts",
    "mobile.calendarDayEnd": "Work ends",
    "mobile.calendarDayConflictCount": "Conflicting bookings: {count}",
    "mobile.calendarDayConflictDescription":
      "These bookings will stay unchanged. New booking availability will follow the selected schedule.",
    "mobile.calendarDaySaveFailed": "Could not save the day schedule.",
    "mobile.calendarDayInvalidHours":
      "Set the end of the work period after its start.",
    "mobile.calendarDaySave": "Save",
    "mobile.calendarDayReset": "Restore weekly schedule",
    "mobile.calendarDayClosedStatus": "Day off",
    "mobile.calendarDayWorkingHours": "Working hours",
    "mobile.calendarDayResetDone": "Weekly schedule restored",
    "mobile.calendarDayClosedSaved": "Day closed for bookings",
    "mobile.calendarDayHoursSaved": "Working hours updated",
    "mobile.calendarPrevious": "Previous date",
    "mobile.calendarNext": "Next date",
    "mobile.calendarPreviousWeek": "Previous week",
    "mobile.calendarNextWeek": "Next week",
    "mobile.calendarTapToBook": "Tap to create a booking",
    "mobile.calendarChooseTime": "Choose a start time",
    "mobile.calendarBookingTab": "Booking",
    "mobile.calendarBreakTab": "Break",
    "mobile.calendarDayView": "Day",
    "mobile.calendarWeekView": "Week",
    "mobile.calendarMonthView": "Month",
    "mobile.calendarPreviousMonth": "Previous month",
    "mobile.calendarNextMonth": "Next month",
    "mobile.monthBookings": "bookings",
    "mobile.monthBlocks": "blocks",
    "mobile.monthNoBookings": "No bookings",
    "mobile.weekBookings": "bookings",
    "mobile.weekNoBookings": "No bookings",
    "mobile.calendarWorkload": "workload",
    "mobile.calendarLoadLow": "low <30%",
    "mobile.calendarLoadMedium": "medium 30–69%",
    "mobile.calendarLoadHigh": "high ≥70%",
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
    "mobile.manualBookingSearchHint":
      "Enter a customer name, phone, or email to see matching results.",
    "mobile.manualBookingNoCustomers": "No customers have been added yet.",
    "mobile.manualBookingCustomerName": "Customer name *",
    "mobile.manualBookingCustomerEmail": "Customer email",
    "mobile.manualBookingCustomerPhone": "Customer phone",
    "mobile.manualBookingService": "Services",
    "mobile.manualBookingServices": "Services *",
    "mobile.manualBookingAddService": "Add service",
    "mobile.manualBookingMoveServiceUp": "Move service up",
    "mobile.manualBookingMoveServiceDown": "Move service down",
    "mobile.manualBookingRemoveService": "Remove service",
    "mobile.manualBookingNoServicesSelected": "Choose one or more services.",
    "mobile.manualBookingServicesRequired": "Choose at least one service.",
    "mobile.manualBookingServiceLimitReached":
      "You can choose up to 20 services per booking.",
    "mobile.manualBookingCurrencyMismatch":
      "Services in one booking must use the same currency.",
    "mobile.manualBookingTotal": "total",
    "mobile.manualBookingDate": "Date *",
    "mobile.manualBookingTime": "Available time *",
    "mobile.manualBookingNoSlots": "There are no available times on this date.",
    "mobile.manualBookingDuration": "Booking duration",
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
    "mobile.receivedRevenue": "Received",
    "mobile.finances": "Finances",
    "mobile.financeSummaryTitle": "Monthly overview",
    "mobile.financeIncome": "Booking amounts",
    "mobile.financeActual": "Received",
    "mobile.financeActualDescription": "Payment amount entered by the provider",
    "mobile.financeProfitUnavailable":
      "This is not profit: expenses are not included.",
    "mobile.financeShowDetails": "Show details",
    "mobile.financeHideDetails": "Hide details",
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
    "mobile.financeWeeklyIncome": "Income by week",
    "mobile.financeNoReceivedIncome": "No payments have been received yet.",
    "mobile.profileWorkingDays": "Working days per week: {count}",
    "mobile.profileBookingInterval": "Booking interval: {minutes} min",
    "mobile.profileOpenBooking": "Open booking page",
    "mobile.paymentReceived": "Received for appointment",
    "mobile.paymentAmountHint": "Service price",
    "mobile.paymentAmountInvalid":
      "Enter an amount from 0 to 99,999,999.99 (2 decimal places max).",
    "mobile.paymentSave": "Save payment",
    "mobile.paymentSaved": "Payment saved",
    "mobile.paymentSaveFailed": "Could not save payment.",
    "mobile.nextBooking": "Next booking",
    "mobile.calendarManualBooking": "Created by you",
    "mobile.calendarOnlineBooking": "Online booking",
    "mobile.calendarBreak": "Break",
    "mobile.noBookingsToday": "There are no bookings today.",
    "mobile.noBookingsOnDay": "There are no bookings for this date.",
    "mobile.daySchedule": "Day schedule",
    "mobile.firstService": "Your first service",
    "mobile.noServices": "No active services yet.",
    "mobile.workingHours": "Working hours",
    "mobile.publicBookingLink": "Public booking link",
    "mobile.publicBookingDescription":
      "Clients can choose a service and available time.",
    "mobile.settings": "Settings",
    "mobile.personalBlocks": "Personal blocks",
    "mobile.personalBlockEmpty":
      "There are no personal blocks in the next few days.",
    "mobile.personalBlockTitle": "Block time",
    "mobile.personalBlockEditTitle": "Edit break",
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
    "mobile.personalBlockSaveChanges": "Save changes",
    "mobile.personalBlockAdd": "Add break",
    "mobile.personalBlockDelete": "Delete",
    "mobile.personalBlockDeleteConfirm":
      "This break will be removed and the time will become available for bookings again.",
    "mobile.personalBlockOverlap":
      "This time overlaps an existing booking or block.",
    "mobile.personalBlockCreated": "Personal block added",
    "mobile.personalBlockUpdated": "Break updated",
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
    "mobile.serviceArchiveEmpty": "The service archive is empty.",
    "mobile.serviceActive": "Active",
    "mobile.serviceArchived": "Archived",
    "mobile.serviceName": "Service name *",
    "mobile.serviceChoose": "Choose a service",
    "mobile.serviceSearch": "Search by name, description, or category",
    "mobile.serviceSearchClear": "Clear search",
    "mobile.serviceSearchEmpty": "No services found.",
    "mobile.serviceFiltersClear": "Clear filters",
    "mobile.serviceCategory": "Category",
    "mobile.serviceCategoryHint":
      "Choose an existing category or enter a new one.",
    "mobile.serviceCategoryPlaceholder": "For example, Manicure",
    "mobile.serviceAllCategories": "All",
    "mobile.serviceUncategorized": "Uncategorized",
    "mobile.serviceDescription": "Description",
    "mobile.serviceDuration": "Duration in minutes *",
    "mobile.servicePrice": "Price *",
    "mobile.serviceCurrency": "Currency *",
    "mobile.serviceBufferBefore": "Buffer before, minutes",
    "mobile.serviceBufferAfter": "Buffer after, minutes",
    "mobile.serviceSortOrder": "Sort order",
    "mobile.serviceSourceLanguage": "Source name language",
    "mobile.serviceTranslationReviewHint":
      "AI can make mistakes or change the meaning. Review each translation and edit it before saving if needed. The name, description, and category are sent to OpenAI; API usage may be billed separately.",
    "mobile.serviceTranslationQuotaWarning":
      "{remaining} of {limit} free AI translation generations remain for this workspace this month.",
    "mobile.serviceTranslationQuotaExceeded":
      "The free monthly AI translation generation limit has been reached. It resets at the start of next month.",
    "mobile.serviceTranslateWithAi": "Suggest translations with AI",
    "mobile.serviceTranslationLoading": "Preparing translations…",
    "mobile.serviceTranslationFailed":
      "Could not prepare translations. Try again.",
    "mobile.serviceTranslationNameRequired": "Enter the service name first.",
    "mobile.serviceTranslationsShow": "Enter translations manually",
    "mobile.serviceTranslationsHide": "Hide translations",
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
    "booking.searchServices": "Search by service or category",
    "booking.selectedServices": "Selected services",
    "booking.removeService": "Remove {name}",
    "booking.remove": "Remove",
    "booking.totalDuration": "Total duration",
    "booking.totalPrice": "Total",
    "booking.categoryOther": "Uncategorized",
    "booking.noMatchingServices": "No services found. Try another search.",
    "booking.noServices": "There are no services available for booking yet.",
    "booking.slotNoLongerAvailable":
      "This time was just taken. Choose another available time.",
    "booking.chooseDate": "Choose a date",
    "booking.chooseTime": "Choose a time",
    "booking.yourDetails": "Your details",
    "booking.name": "Name",
    "booking.email": "Email",
    "booking.emailRequired": "Enter your email to send the request.",
    "booking.emailInvalid": "Enter a valid email address.",
    "booking.emailNotificationNotice":
      "We will email you when the master decides about your request. We will not send marketing emails.",
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
      "Fields marked with * are required. We need your email to tell you the master's decision; phone is optional.",
    "booking.optional": "optional",
    "booking.manageUnavailableTitle": "This link is unavailable",
    "booking.manageUnavailable":
      "The link has expired or the appointment is no longer available. Ask the professional for a new link.",
    "booking.manageDescription": "Your appointment details",
    "booking.manageConfirm": "Confirm booking",
    "booking.manageCancel": "Cancel booking",
    "booking.manageCancelPrompt":
      "Are you sure you want to cancel this booking? This cannot be undone.",
    "booking.manageCancelConfirm": "Confirm cancellation",
    "booking.manageKeepBooking": "Keep booking",
    "booking.managePending": "Awaiting confirmation",
    "booking.manageConfirmed": "Confirmed",
    "booking.manageCancelled": "Cancelled",
    "booking.manageCompleted": "Completed",
    "booking.manageActionFailed": "We couldn't update the booking. Try again.",
  },
  sk: slovakMessages,
  uk: ukrainianMessages,
};

export const translationKeys = Object.keys(messages.en) as MessageKey[];

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

  if (normalized === "sk" || normalized.startsWith("sk-")) {
    return "sk";
  }

  if (normalized === "uk" || normalized.startsWith("uk-")) {
    return "uk";
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

export function formatDuration(
  minutes: number,
  locale: SupportedLocale,
): string {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  const formatter = new Intl.NumberFormat(getIntlLocale(locale), {
    style: "unit",
    unit: "minute",
    unitDisplay: "long",
  });
  const parts = [
    ...(hours
      ? [
          new Intl.NumberFormat(getIntlLocale(locale), {
            style: "unit",
            unit: "hour",
            unitDisplay: "long",
          }).format(hours),
        ]
      : []),
    ...(remainder ? [formatter.format(remainder)] : []),
  ];
  if (!parts.length) return formatter.format(0);
  return parts.length === 1
    ? parts[0]
    : new Intl.ListFormat(getIntlLocale(locale), {
        style: "long",
        type: "conjunction",
      }).format(parts);
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
  en: "EN",
  cz: "CZ",
  sk: "SK",
  ru: "RU",
  uk: "UA",
};
