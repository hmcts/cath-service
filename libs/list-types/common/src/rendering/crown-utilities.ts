import { DateTime } from "luxon";
import type { CaseSummary } from "../email-summary/case-summary-formatter.js";

export interface Party {
  partyRole: string;
  individualDetails?: {
    title?: string;
    individualForenames?: string;
    individualMiddleName?: string;
    individualSurname?: string;
  };
  organisationDetails?: {
    organisationName?: string;
  };
}

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
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export function formatCrownLastUpdated(isoDateTime: string, locale: string): string {
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London").setLocale(locale);
  const dateStr = dt.toFormat("dd MMMM yyyy");
  const hours = dt.hour;
  const minutes = dt.minute;
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  return `${dateStr} at ${hour12}${minuteStr}${period}`;
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

interface PddaPersonalDetailsLike {
  IsMasked: "yes" | "no";
  MaskedName?: string;
  Name: { CitizenNameForename?: string[]; CitizenNameSurname?: string };
}

interface PddaSittingLike {
  Hearings?: Array<{
    Defendants?: Array<{ PersonalDetails: PddaPersonalDetailsLike }>;
    HearingDetails: { HearingDescription?: string; HearingType?: string };
    CaseNumber: string;
    Prosecution?: { ProsecutingAuthority?: string };
  }>;
}

function formatPddaDefendantName(personalDetails: PddaPersonalDetailsLike): string {
  if (personalDetails.IsMasked === "yes" && personalDetails.MaskedName) {
    return personalDetails.MaskedName;
  }
  const name = personalDetails.Name;
  const forenames = (name.CitizenNameForename ?? []).join(" ");
  return [forenames, name.CitizenNameSurname].filter(Boolean).join(" ");
}

export function extractPddaSittingsSummary(courtLists: Array<{ Sittings: PddaSittingLike[] }>): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of courtLists) {
    for (const sitting of courtList.Sittings) {
      for (const hearing of sitting.Hearings ?? []) {
        const defendants = (hearing.Defendants ?? []).map((d) => formatPddaDefendantName(d.PersonalDetails)).filter((n) => n.length > 0);
        const hearingType = hearing.HearingDetails.HearingDescription || hearing.HearingDetails.HearingType || "";
        const fields: CaseSummary = [];

        if (defendants.length > 0) {
          fields.push({ label: "Defendant name(s)", value: defendants.join(", ") });
        }
        fields.push({ label: "Case reference", value: hearing.CaseNumber });
        fields.push({ label: "Prosecuting authority", value: hearing.Prosecution?.ProsecutingAuthority || "" });
        fields.push({ label: "Hearing type", value: hearingType });

        summaries.push(fields);
      }
    }
  }

  return summaries;
}
