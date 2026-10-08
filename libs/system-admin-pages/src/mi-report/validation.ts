export const MI_REPORT_PERIODS = ["7", "14", "21", "30", "all"] as const;

export const MI_REPORT_TYPES = ["user-accounts", "publications", "location-subscriptions", "all-subscriptions", "all-data"] as const;

export function validateMiReportSelection(body: unknown, messages: MiReportValidationMessages): MiReportValidationResult {
  const source = (body ?? {}) as Record<string, unknown>;
  const errors: MiReportSelectionError[] = [];

  const period = normaliseValue(source.period);
  const reportType = normaliseValue(source.reportType);

  const isValidPeriod = period !== undefined && (MI_REPORT_PERIODS as readonly string[]).includes(period);
  const isValidType = reportType !== undefined && (MI_REPORT_TYPES as readonly string[]).includes(reportType);

  if (!isValidPeriod) {
    errors.push({ text: messages.periodError, href: "#period" });
  }

  if (!isValidType) {
    errors.push({ text: messages.reportTypeError, href: "#reportType" });
  }

  if (errors.length > 0 || !isValidPeriod || !isValidType) {
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [], period: period as MiReportPeriod, reportType: reportType as MiReportType };
}

function normaliseValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export type MiReportPeriod = (typeof MI_REPORT_PERIODS)[number];

export type MiReportType = (typeof MI_REPORT_TYPES)[number];

export interface MiReportValidationMessages {
  periodError: string;
  reportTypeError: string;
}

export interface MiReportSelectionError {
  text: string;
  href: string;
}

export type MiReportValidationResult =
  | { isValid: true; errors: MiReportSelectionError[]; period: MiReportPeriod; reportType: MiReportType }
  | { isValid: false; errors: MiReportSelectionError[] };
