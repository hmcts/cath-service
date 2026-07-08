import { DateTime } from "luxon";

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

  const hours = dt.hour;
  const minutes = dt.minute;
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;

  const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  const time = `${hour12}${minuteStr}${period}`;

  return { date, time };
}

/**
 * Normalizes time format by replacing "." with ":"
 * Example: "2.30pm" -> "2:30pm"
 */
export function normalizeTime(time: string): string {
  return time.replace(".", ":");
}

/**
 * Formats a dd/MM/yyyy date string to a localized long date string
 * Example: "15/01/2026" -> "15 January 2026"
 */
export function formatDdMmYyyyDate(ddMMyyyyDate: string, locale: string): string {
  const [day, month, year] = ddMMyyyyDate.split("/");
  const date = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10));

  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  return date.toLocaleDateString(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}
