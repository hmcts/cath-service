import Papa from "papaparse";
import type { ReportApplication } from "./queries.js";

const CSV_HEADERS = ["Full name", "Email", "Employer", "Request date", "Status"];

// papaparse's built-in `escapeFormulae: true` pattern ends in `.*$` without the `s` flag,
// so a value starting with "=" that also contains a newline slips through unescaped.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

export function buildMediaApplicationReportCsv(applications: ReportApplication[]): string {
  const data = applications.map((application) => [
    application.name,
    application.email,
    application.employer,
    formatRequestDate(application.appliedDate),
    application.status
  ]);

  return Papa.unparse({ fields: CSV_HEADERS, data }, { escapeFormulae: FORMULA_PREFIX });
}

function formatRequestDate(date: Date): string {
  const parts = Object.fromEntries(DATE_TIME_FORMAT.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}
