import type { DemoAppointment } from "../../demo/types";
import { addCalendarDays, getCalendarDateRange } from "./calendar";
import { buildMonthCalendar, type MonthCalendarDay } from "./monthCalendar";

export function buildDemoMonthCalendar(
  appointments: readonly DemoAppointment[],
  monthDate: string,
  selectedDate: string,
  todayDate: string,
): MonthCalendarDay[] {
  const days = buildMonthCalendar({
    appointments: [],
    availabilityRules: Array.from({ length: 7 }, (_, index) => ({
      dayOfWeek: index + 1,
      endLocalTime: "21:00",
      startLocalTime: "08:00",
    })),
    blocks: [],
    monthDate,
    selectedDate: `${monthDate.slice(0, 7)}-15`,
    timezone: "UTC",
    todayDate,
  });
  const monthStart = getCalendarDateRange(monthDate, "month").fromDate;
  const demoByDate = new Map<string, DemoAppointment[]>();

  appointments.forEach((appointment, index) => {
    const date = addCalendarDays(monthStart, index * 5);
    const bookings = demoByDate.get(date) ?? [];
    bookings.push(appointment);
    demoByDate.set(date, bookings);
  });

  return days.map((day) => {
    const bookings = demoByDate.get(day.date) ?? [];
    const acceptedBookings = bookings.filter(
      (booking) => booking.status === "confirmed",
    );
    const expectedRevenueByCurrency: Record<string, number> = {};
    if (bookings.length) {
      expectedRevenueByCurrency.CZK = bookings.reduce(
        (sum, booking) => sum + booking.priceAmount,
        0,
      );
    }
    return {
      ...day,
      bookingCount: acceptedBookings.length,
      expectedRevenueByCurrency,
      isSelected: day.date === selectedDate,
      workloadPercent: Math.min(
        100,
        Math.round(
          (acceptedBookings.reduce(
            (sum, booking) => sum + booking.durationMinutes,
            0,
          ) /
            (13 * 60)) *
            100,
        ),
      ),
    };
  });
}
