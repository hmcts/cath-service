import { normalizeTime } from "./date-formatting.js";

export function normaliseHearings<T extends NormalisableHearing>(hearings: T[]): T[] {
  return hearings.map(normaliseHearing);
}

export function normaliseHearing<T extends NormalisableHearing>(hearing: T): T {
  return {
    ...hearing,
    time: normalizeTime(hearing.time ?? ""),
    additionalInformation: hearing.additionalInformation || ""
  };
}

interface NormalisableHearing {
  time?: string;
  additionalInformation?: string;
}
