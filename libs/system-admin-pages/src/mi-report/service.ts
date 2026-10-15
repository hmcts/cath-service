import { generateMiReportExcel, type MiReportSheet } from "@hmcts/excel-generation";
import { buildCourtNameResolver } from "./court-name-resolver.js";
import { buildAllSubscriptionsSheet, buildLocationSubscriptionsSheet, buildPublicationsSheet, buildUserAccountsSheet } from "./queries.js";
import type { MiReportPeriod, MiReportType } from "./validation.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const SHEET_BUILDERS: Record<Exclude<MiReportType, "all-data">, (cutoff?: Date) => Promise<MiReportSheet>> = {
  "user-accounts": buildUserAccountsSheet,
  publications: buildPublicationsSheet,
  "location-subscriptions": buildLocationSubscriptionsSheet,
  "all-subscriptions": buildAllSubscriptionsSheet
};

export async function buildMiReport(reportType: MiReportType, period: MiReportPeriod): Promise<MiReport> {
  const cutoff = resolveCutoff(period);

  const sheets = reportType === "all-data" ? await buildAllDataSheets(cutoff) : [await SHEET_BUILDERS[reportType](cutoff)];

  const buffer = await generateMiReportExcel(sheets);
  const filename = buildFilename(reportType, period);

  return { buffer, filename };
}

function resolveCutoff(period: MiReportPeriod): Date | undefined {
  if (period === "all") {
    return undefined;
  }
  return new Date(Date.now() - Number(period) * MS_PER_DAY);
}

async function buildAllDataSheets(cutoff?: Date): Promise<MiReportSheet[]> {
  const resolver = await buildCourtNameResolver();

  return Promise.all([
    buildUserAccountsSheet(cutoff),
    buildPublicationsSheet(cutoff, resolver),
    buildLocationSubscriptionsSheet(cutoff, resolver),
    buildAllSubscriptionsSheet(cutoff, resolver)
  ]);
}

function buildFilename(reportType: MiReportType, period: MiReportPeriod): string {
  const periodToken = period === "all" ? "from-beginning" : `${period}days`;
  const dateToken = new Date().toISOString().split("T")[0];
  return `mi-report-${reportType}-${periodToken}-${dateToken}.xlsx`;
}

export interface MiReport {
  buffer: Buffer;
  filename: string;
}
