import { DateTime } from "luxon";

const DAY_MONTH_YEAR_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/**
 * Formats a Date object to a localized long date string (e.g., "15 January 2026")
 */
export function formatDisplayDate(date: Date, locale: string): string {
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  return date.toLocaleDateString(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/**
 * Formats an ISO datetime string to separate date and time strings
 * Date format: "15 January 2026"
 * Time format: "2:30pm" or "2pm"
 */
export function formatLastUpdatedDateTime(isoDateTime: string, locale: string): { date: string; time: string } {
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London").setLocale(locale);

  const date = dt.toFormat("d MMMM yyyy");
  const time = formatTo12Hour(dt.hour, dt.minute);

  return { date, time };
}

/**
 * Formats an "HH:MM" time string to a compact 12-hour format
 * Examples: "09:00" -> "9am", "10:05" -> "10:05am", "14:30" -> "2:30pm"
 */
export function formatHHMMTime(time: string): string {
  const [hoursStr, minutesStr] = time.split(":");
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr ?? "0", 10);

  if (Number.isNaN(hours)) return time;

  return formatTo12Hour(hours, minutes);
}

function formatTo12Hour(hours: number, minutes: number): string {
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  return `${hour12}${minuteStr}${period}`;
}

/**
 * Normalizes time format by replacing "." with ":"
 * Example: "2.30pm" -> "2:30pm"
 */
export function normalizeTime(time: string): string {
  return time.replace(".", ":");
}

/**
 * Formats a d/M/yyyy date string to a localized long date string
 * Example: "15/01/2026" -> "15 January 2026"
 * Input that is not a whole, valid d/M/yyyy date is returned unchanged so a bad value never breaks a download.
 */
export function formatDdMmYyyyDate(ddMMyyyyDate: string, locale: string): string {
  const match = DAY_MONTH_YEAR_PATTERN.exec(ddMMyyyyDate.trim());
  if (!match) return ddMMyyyyDate;

  const [, day, month, year] = match;
  const date = DateTime.fromObject({ year: Number(year), month: Number(month), day: Number(day) }, { zone: "utc" });
  if (!date.isValid) return ddMMyyyyDate;

  return date.setLocale(locale === "cy" ? "cy" : "en-GB").toFormat("d MMMM yyyy");
}
