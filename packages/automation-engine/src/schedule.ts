import type { ScheduleSpec } from "./contracts.ts";
function localParts(
  date: Date,
  timeZone: string,
): { key: string; weekday: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    key: `${value("year")}-${value("month")}-${value("day")}-${value("hour")}-${value("minute")}`,
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      value("weekday"),
    ),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}
export function assertSchedule(spec: ScheduleSpec): void {
  new Intl.DateTimeFormat("en-US", { timeZone: spec.time_zone }).format();
  if (
    !Number.isInteger(spec.hour) ||
    spec.hour < 0 ||
    spec.hour > 23 ||
    !Number.isInteger(spec.minute) ||
    spec.minute < 0 ||
    spec.minute > 59
  )
    throw new Error("Invalid schedule time");
}
export function nextScheduledAt(spec: ScheduleSpec, after: Date): Date {
  assertSchedule(spec);
  const allowed = spec.days_of_week ?? [0, 1, 2, 3, 4, 5, 6];
  let cursor = new Date(Math.floor(after.getTime() / 60000) * 60000 + 60000);
  for (
    let index = 0;
    index < 60 * 24 * 8;
    index += 1, cursor = new Date(cursor.getTime() + 60000)
  ) {
    const local = localParts(cursor, spec.time_zone);
    if (
      allowed.includes(local.weekday) &&
      local.hour === spec.hour &&
      local.minute === spec.minute
    ) {
      let repeated = false;
      for (let back = 1; back <= 180; back += 1)
        if (
          localParts(new Date(cursor.getTime() - back * 60000), spec.time_zone)
            .key === local.key
        ) {
          repeated = true;
          break;
        }
      if (!repeated) return cursor;
    }
  }
  throw new Error(
    "No schedule occurrence exists in the next eight days (the local time may be skipped by DST)",
  );
}
