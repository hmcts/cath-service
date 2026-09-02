import { DateTime } from "luxon";

export function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const dt = DateTime.fromISO(dateStr);
  if (!dt.isValid) return dateStr;
  return dt.toFormat("dd/MM/yyyy");
}
