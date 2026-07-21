import type { Session, Sitting } from "@hmcts/list-types-common";

// Date/time formatters are shared across all cause lists — reuse the canonical
// implementations from list-types-common rather than duplicating them here.
export { formatContentDate, formatPublicationDateTime, formatTime } from "@hmcts/list-types-common";

// Accepts both the venue address and the (more loosely typed) courthouse address shapes.
interface AddressLike {
  line?: string[];
  town?: string;
  county?: string;
  postCode?: string;
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
