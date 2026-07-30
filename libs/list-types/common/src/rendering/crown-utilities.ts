import { DateTime } from "luxon";
import type { CaseSummary } from "../email-summary/case-summary-formatter.js";
import type { Party } from "../models/cause-list-types.js";

export function createPartyDetails(party: Party): string {
  if (party.individualDetails) {
    const details = party.individualDetails;
    const parts: string[] = [];
    if (details.title) parts.push(details.title);
    if (details.individualForenames) parts.push(details.individualForenames);
    if (details.individualMiddleName) parts.push(details.individualMiddleName);
    if (details.individualSurname) parts.push(details.individualSurname);
    return parts.filter((n) => n.length > 0).join(" ");
  }
  if (party.organisationDetails?.organisationName) {
    return party.organisationDetails.organisationName;
  }
  return "";
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
  return `${dateStr} at ${hour12}${minuteStr}${period}`;
}

export function formatCrownLastUpdated(isoDateTime: string, locale: string): string {
  return formatPublicationDateTime(isoDateTime, locale);
}

export interface PddaCitizenName {
  CitizenNameTitle?: string;
  CitizenNameForename?: string[];
  CitizenNameSurname?: string;
  CitizenNameRequestedName?: string;
  CitizenNameSuffix?: string;
}

export function formatPddaCitizenName(name: PddaCitizenName): string {
  if (name.CitizenNameRequestedName) {
    return name.CitizenNameRequestedName;
  }
  const forenames = (name.CitizenNameForename ?? []).join(" ");
  return [name.CitizenNameTitle, forenames, name.CitizenNameSurname, name.CitizenNameSuffix].filter(Boolean).join(" ");
}

export function formatPddaDefendantName(personalDetails: { Name: PddaCitizenName; MaskedName?: string; IsMasked: "YES" | "NO" }): string {
  if (personalDetails.IsMasked === "YES" && personalDetails.MaskedName) {
    return personalDetails.MaskedName;
  }
  return formatPddaCitizenName(personalDetails.Name);
}

export function formatPddaSittingTime(timeStr: string | undefined): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  if (minutes === 0) return `${displayHours}${ampm}`;
  return `${displayHours}:${String(minutes).padStart(2, "0")}${ampm}`;
}

interface PddaSittingLike {
  Hearings?: Array<{
    Defendants?: Array<{ PersonalDetails: { Name: PddaCitizenName; MaskedName?: string; IsMasked: "YES" | "NO" } }>;
    HearingDetails: { HearingDescription?: string; HearingType?: string };
    CaseNumber: string;
    CaseNumberCaTH?: string;
    Prosecution?: { ProsecutingAuthority?: string };
  }>;
}

export function extractPddaSittingsSummary(courtLists: Array<{ Sittings: PddaSittingLike[] }>): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of courtLists) {
    for (const sitting of courtList.Sittings) {
      for (const hearing of sitting.Hearings ?? []) {
        const defendants = (hearing.Defendants ?? []).map((d) => formatPddaDefendantName(d.PersonalDetails)).filter((n) => n.length > 0);
        const hearingType = hearing.HearingDetails.HearingDescription || hearing.HearingDetails.HearingType || "";
        const fields: CaseSummary = [];

        fields.push({ label: "Defendant Name(s)", value: defendants.join(", ") });
        fields.push({ label: "Prosecuting Authority", value: hearing.Prosecution?.ProsecutingAuthority || "" });
        fields.push({ label: "Case Reference", value: hearing.CaseNumberCaTH || hearing.CaseNumber });
        fields.push({ label: "Hearing Type", value: hearingType });

        summaries.push(fields);
      }
    }
  }

  return summaries;
}
