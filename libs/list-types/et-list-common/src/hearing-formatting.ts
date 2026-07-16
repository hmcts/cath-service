import type { Session, Sitting } from "@hmcts/daily-cause-list-common";
import { DateTime } from "luxon";

// Accepts both the venue address and the (more loosely typed) courthouse address shapes.
interface AddressLike {
  line?: string[];
  town?: string;
  county?: string;
  postCode?: string;
}

export function formatTime(isoDateTime: string): string {
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London");
  const hours = dt.hour;
  const minutes = dt.minute;
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  return `${hour12}${minuteStr}${period}`;
}

export function formatContentDate(date: Date, locale: string): string {
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  return date.toLocaleDateString(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export function formatPublicationDateTime(isoDateTime: string, locale: string): string {
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London").setLocale(locale);

  const dateStr = dt.toFormat("d MMMM yyyy");

  const hours = dt.hour;
  const minutes = dt.minute;
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;

  const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  const timeStr = `${hour12}${minuteStr}${period}`;

  return `${dateStr} at ${timeStr}`;
}

export function formatAddress(address: AddressLike | undefined): string[] {
  const parts: string[] = [];

  if (!address) {
    return parts;
  }

  for (const line of address.line ?? []) {
    if (line && line.length > 0) {
      parts.push(line);
    }
  }

  if (address.town && address.town.length > 0) {
    parts.push(address.town);
  }

  if (address.county && address.county.length > 0) {
    parts.push(address.county);
  }

  if (address.postCode && address.postCode.length > 0) {
    parts.push(address.postCode);
  }

  return parts;
}

export function calculateSittingDuration(sitting: Sitting): { durationAsHours: number; durationAsMinutes: number } {
  if (!sitting.sittingStart || !sitting.sittingEnd) {
    return { durationAsHours: 0, durationAsMinutes: 0 };
  }

  const start = new Date(sitting.sittingStart);
  const end = new Date(sitting.sittingEnd);
  const totalMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

  return {
    durationAsHours: Math.floor(totalMinutes / 60),
    durationAsMinutes: totalMinutes % 60
  };
}

export function resolveHearingChannel(sitting: Sitting, session: Session): string {
  if (sitting.channel && sitting.channel.length > 0) {
    return sitting.channel.join(", ");
  }
  if (session.sessionChannel && session.sessionChannel.length > 0) {
    return session.sessionChannel.join(", ");
  }
  return "";
}
