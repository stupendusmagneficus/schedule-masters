import {
  formatDate,
  formatTime,
  type SupportedLocale,
} from "@schedule-app/i18n";

type FreeSlotForSharing = {
  readonly available_date: string;
  readonly starts_at: string;
};

export function buildFreeSlotsShareMessage({
  heading,
  availabilityNote,
  locale,
  slots,
  timezone,
  workspaceName,
}: {
  readonly heading: string;
  readonly availabilityNote: string;
  readonly locale: SupportedLocale;
  readonly slots: readonly FreeSlotForSharing[];
  readonly timezone: string;
  readonly workspaceName: string;
}): string {
  const slotsByDate = new Map<string, string[]>();
  for (const slot of slots) {
    const times = slotsByDate.get(slot.available_date) ?? [];
    times.push(
      formatTime(new Date(slot.starts_at), locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }),
    );
    slotsByDate.set(slot.available_date, times);
  }

  const schedule = [...slotsByDate.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, times]) => {
      times.sort();
      const dateLabel = formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
        year: "numeric",
      });
      return `${dateLabel}: ${times.join(", ")}`;
    });

  return [workspaceName, heading, availabilityNote, "", ...schedule].join("\n");
}
