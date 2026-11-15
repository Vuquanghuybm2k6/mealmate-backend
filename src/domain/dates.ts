export function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Khoá ngày theo giờ địa phương của server, dạng YYYY-MM-DD.
 * Dùng chung cho streak, lịch sử ăn uống và nhắc bữa để tránh lệch múi giờ.
 */
export function toDateKey(value: Date): string {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(
    value.getDate(),
  )}`;
}

export function toTimeOfDay(value: Date): string {
  return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function startOfDay(value: Date): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    0,
    0,
    0,
    0,
  );
}

export function endOfDay(value: Date): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);

  return toDateKey(date);
}

export function addDays(value: Date, days: number): Date {
  const copy = new Date(value.getTime());
  copy.setDate(copy.getDate() + days);

  return copy;
}

export function daysBetweenDateKeys(first: string, second: string): number {
  const firstDate = parseDateKey(first);
  const secondDate = parseDateKey(second);

  return Math.round(
    (secondDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000),
  );
}

export function parseTimeOfDay(
  timeOfDay: string,
  date: Date,
): Date | null {
  const [hours, minutes] = timeOfDay.split(':').map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0,
  );
}

export function dateRangeKeys(from: Date, to: Date): string[] {
  const keys: string[] = [];
  let current = startOfDay(from);
  const end = endOfDay(to);

  while (current.getTime() <= end.getTime()) {
    keys.push(toDateKey(current));
    current = addDays(current, 1);
  }

  return keys;
}
