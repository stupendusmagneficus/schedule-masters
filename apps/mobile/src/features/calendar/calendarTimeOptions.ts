import { getDayTimelineSlotStart } from "./dayTimeline";

type CalendarTimeOptionsInput = {
  readonly date: string;
  readonly endMinute: number;
  readonly minute: number;
  readonly now?: Date;
  readonly timezone: string;
};

const quarterHourMinutes = 15;
const calendarTimeOptionCount = 4;

export function getCalendarTimeOptions({
  date,
  endMinute,
  minute,
  now = new Date(),
  timezone,
}: CalendarTimeOptionsInput): string[] {
  const firstMinute =
    Math.ceil(minute / quarterHourMinutes) * quarterHourMinutes;
  const options: string[] = [];

  for (let index = 0; index < calendarTimeOptionCount; index += 1) {
    const candidateMinute = firstMinute + index * quarterHourMinutes;
    if (candidateMinute >= endMinute || candidateMinute >= 24 * 60) break;

    const startsAt = getDayTimelineSlotStart(date, candidateMinute, timezone);
    if (new Date(startsAt).getTime() > now.getTime()) options.push(startsAt);
  }

  return options;
}
