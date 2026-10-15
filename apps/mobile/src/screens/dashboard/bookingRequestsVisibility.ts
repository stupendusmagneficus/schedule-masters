export function shouldShowBookingRequests(
  selectedDate: string,
  todayDate: string,
): boolean {
  return selectedDate >= todayDate;
}
