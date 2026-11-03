// Removes what is known to differ between captures without meaning anything: IDs issued at seed
// time, dates and times derived from when the data was seeded, live-region announcements caught
// mid-update, and link hosts. Measured on two fresh pip baseline runs: after these rules only
// row order in unsorted tables differs, which the comparison handles separately.

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_CY = ["Ionawr", "Chwefror", "Mawrth", "Ebrill", "Mai", "Mehefin", "Gorffennaf", "Awst", "Medi", "Hydref", "Tachwedd", "Rhagfyr"];
const DAY_MS = 24 * 60 * 60 * 1000;
// Dates this close to the seed date come from "now" (display windows, created and audit dates);
// fixture dates are years earlier and are compared as they are
const RUN_DATE_WINDOW_DAYS = 45;

export interface NormaliseContext {
  // When the data shown was seeded (provenance.source.seededAt), in ISO form
  seededAt?: string | null;
  // Known IDs to replace with stable names, e.g. { "<artefact:civil-and-family>": "d1c4…" }
  knownIds?: Record<string, string>;
}

export function normalise(text: string, context: NormaliseContext = {}): string {
  let result = text;
  for (const [token, id] of Object.entries(context.knownIds ?? {})) if (id) result = result.split(id).join(token);
  result = result.replace(UUID, "<ID>");
  if (context.seededAt) result = maskRunDates(result, new Date(context.seededAt));
  result = result
    // Curly and straight quotes read the same; templates and locale files mix them freely
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    // Screen-reader status regions (e.g. "1 result is available") are captured mid-update
    .replace(/^(\s*- status)(:.*)?$/gm, "$1")
    // Hosts differ between apps and environments; paths and queries are what matter
    .replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g, "")
    .replace(/[?&]lng=(en|cy)\b/g, "");
  return result;
}

function maskRunDates(text: string, seededAt: Date): string {
  const offsetToken = (date: Date) => {
    const days = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - utcDay(seededAt)) / DAY_MS);
    return Math.abs(days) <= RUN_DATE_WINDOW_DAYS ? `<RUN_DATE${days === 0 ? "" : days > 0 ? `+${days}` : days}>` : null;
  };
  let result = text
    // 2026-10-23T10:12:16, optionally with fractions and zone
    .replace(/\b(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?/g, (m, y, mo, d) => {
      const token = offsetToken(new Date(Number(y), Number(mo) - 1, Number(d)));
      return token ? `${token} <RUN_TIME>` : m;
    })
    // 23/10/2026 and 23/10/2026 10:12:16, also URL-encoded as 23%2F10%2F2026+10%3A12%3A16
    .replace(/\b(\d{2})(?:\/|%2F)(\d{2})(?:\/|%2F)(\d{4})((?:\s|\+)\d{2}(?::|%3A)\d{2}(?:(?::|%3A)\d{2})?)?/g, (m, d, mo, y, time) => {
      const token = offsetToken(new Date(Number(y), Number(mo) - 1, Number(d)));
      return token ? `${token}${time ? " <RUN_TIME>" : ""}` : m;
    });

  // 23 October 2026 / 23rd October 2026 / 23 Oct 2026 / 23 Hydref 2026, optionally followed by a time
  const names = [...MONTHS_EN, ...MONTHS_EN.map((m) => m.slice(0, 3)), "Sept", ...MONTHS_CY].join("|");
  result = result.replace(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)? (${names}) (\\d{4})((?:,? (?:at|am) )?\\d{1,2}[:.]\\d{2}(?::\\d{2})?\\s?(?:am|pm|yb|yh)?)?`, "gi"),
    (m, d, month, y, time) => {
      const index = monthIndex(month);
      const token = index === null ? null : offsetToken(new Date(Number(y), index, Number(d)));
      return token ? `${token}${time ? " <RUN_TIME>" : ""}` : m;
    }
  );
  return result;
}

function monthIndex(name: string): number | null {
  const lower = name.toLowerCase();
  const en = MONTHS_EN.findIndex((m) => m.toLowerCase() === lower || m.slice(0, 3).toLowerCase() === lower || (lower === "sept" && m === "September"));
  if (en >= 0) return en;
  const cy = MONTHS_CY.findIndex((m) => m.toLowerCase() === lower);
  return cy >= 0 ? cy : null;
}

function utcDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}
