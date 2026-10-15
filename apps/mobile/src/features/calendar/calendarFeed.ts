import type { SupportedLocale } from "@schedule-app/i18n";
import { formatAccessibleDate, formatCompactDate } from "@schedule-app/i18n";

import type { MasterAppointment } from "../appointments/manualBooking";
import {
  formatDateInTimeZone,
  type PersonalBlock,
} from "../availability/personalBlocks";

export type CalendarFeedFilter = "all" | "future";

export type CalendarFeedItem = {
  readonly appointment?: MasterAppointment;
  readonly block?: PersonalBlock;
  readonly date: string;
  readonly endsAt: string;
  readonly id: string;
  readonly kind: "appointment" | "block";
  readonly startsAt: string;
};

export type CalendarFeedGroup = {
  readonly date: string;
  readonly items: readonly CalendarFeedItem[];
};

type BuildCalendarFeedParams = {
  readonly appointments: readonly MasterAppointment[];
  readonly blocks: readonly PersonalBlock[];
  readonly filter: CalendarFeedFilter;
  readonly now?: Date;
  readonly timezone: string;
};

export function buildCalendarFeed({
  appointments,
  blocks,
  filter,
  now = new Date(),
  timezone,
}: BuildCalendarFeedParams): CalendarFeedGroup[] {
  const nowTime = now.getTime();
  const items: CalendarFeedItem[] = [
    ...appointments
      .filter(
        (appointment) =>
          filter === "all" ||
          ((appointment.status === "pending" ||
            appointment.status === "confirmed") &&
            new Date(appointment.ends_at).getTime() > nowTime),
      )
      .map((appointment) => ({
        appointment,
        date: formatDateInTimeZone(new Date(appointment.starts_at), timezone),
        endsAt: appointment.ends_at,
        id: appointment.id,
        kind: "appointment" as const,
        startsAt: appointment.starts_at,
      })),
    ...blocks
      .filter(
        (block) =>
          filter === "all" || new Date(block.ends_at).getTime() > nowTime,
      )
      .map((block) => ({
        block,
        date: formatDateInTimeZone(new Date(block.starts_at), timezone),
        endsAt: block.ends_at,
        id: block.id,
        kind: "block" as const,
        startsAt: block.starts_at,
      })),
  ];

  items.sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime() ||
      left.kind.localeCompare(right.kind) ||
      left.id.localeCompare(right.id),
  );

  const groups = new Map<string, CalendarFeedItem[]>();
  for (const item of items) {
    const group = groups.get(item.date) ?? [];
    group.push(item);
    groups.set(item.date, group);
  }

  return [...groups].map(([date, groupItems]) => ({
    date,
    items: groupItems,
  }));
}

export function formatCalendarFeedDate(
  date: string,
  locale: SupportedLocale,
  timezone = "Europe/Prague",
): string {
  return formatCompactDate(new Date(`${date}T12:00:00.000Z`), locale, {
    timeZone: timezone,
  });
}

export function getCalendarFeedDateAccessibilityLabel(
  date: string,
  locale: SupportedLocale,
  timezone = "Europe/Prague",
): string {
  return formatAccessibleDate(
    new Date(`${date}T12:00:00.000Z`),
    locale,
    timezone,
  );
}
