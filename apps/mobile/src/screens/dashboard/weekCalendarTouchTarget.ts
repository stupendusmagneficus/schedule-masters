export const WEEK_CALENDAR_VISIBLE_SLOT_HEIGHT = 24;
const minimumTouchTargetHeight = 44;
const minutesPerSlot = 30;

export type WeekCalendarSlotGroup = {
  readonly endMinute: number;
  readonly minutes: readonly number[];
  readonly startMinute: number;
  readonly touchTargetHeight: number;
};

export function groupWeekCalendarSlots(
  slots: readonly number[],
): WeekCalendarSlotGroup[] {
  const groups: WeekCalendarSlotGroup[] = [];

  for (let index = 0; index < slots.length; index += 2) {
    const minutes = slots.slice(index, index + 2);
    const startMinute = minutes[0];

    if (startMinute === undefined) continue;

    const endMinute = startMinute + minutes.length * minutesPerSlot;

    groups.push({
      endMinute,
      minutes,
      startMinute,
      touchTargetHeight: Math.max(
        minutes.length * WEEK_CALENDAR_VISIBLE_SLOT_HEIGHT,
        minimumTouchTargetHeight,
      ),
    });
  }

  return groups;
}
