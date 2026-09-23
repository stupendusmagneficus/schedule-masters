function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return [year, month, day].join("-");
}

function moveToWeekday(date: Date) {
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

export function parseDateInput(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function getNextBookableDate(from = new Date()) {
  const nextDate = new Date(from);
  nextDate.setDate(nextDate.getDate() + 1);
  return formatDateInput(moveToWeekday(nextDate));
}

export function getFollowingBookableDate(value: string) {
  const date = parseDateInput(value);
  if (Number.isNaN(date.getTime())) {
    return getNextBookableDate();
  }

  date.setDate(date.getDate() + 1);
  return formatDateInput(moveToWeekday(date));
}
