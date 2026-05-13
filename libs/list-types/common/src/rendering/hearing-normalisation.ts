import { normalizeTime } from "./date-formatting.js";

export function normaliseHearings<T extends { time: string; additionalInformation: string }>(hearings: T[]): T[] {
  return hearings.map(
    (hearing) =>
      ({
        ...hearing,
        time: normalizeTime(hearing.time),
        additionalInformation: hearing.additionalInformation || ""
      }) as T
  );
}
