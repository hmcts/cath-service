import { findBlockingIssues, formatSyncReport, SyncAbortedError, type SyncReport } from "./sync-report.js";

export const SYNC_RUN_EVENT = "LegacySyncRun";

// Application Insights truncates a custom property at 8192 characters.
const MAX_PROPERTY_LENGTH = 8000;

// One event per run is the record that go/no-go reads: N consecutive nights with outcome "clean".
// Properties carry counts, reasons and ids only, never emails or names.
export async function runSyncJob(job: SyncJob, monitoring?: SyncMonitoring): Promise<void> {
  const { name, title, run } = job;

  const report = await run().catch((error: unknown) => {
    if (error instanceof SyncAbortedError) {
      console.log(formatSyncReport(`${title} aborted`, error.report));
      monitoring?.trackEvent(SYNC_RUN_EVENT, {
        ...buildRunProperties(name, "aborted", error.report, findBlockingIssues(error.report)),
        abortReason: truncate(error.message)
      });
    } else {
      monitoring?.trackEvent(SYNC_RUN_EVENT, { sync: name, outcome: "failed" });
    }
    throw error;
  });

  console.log(formatSyncReport(title, report));

  // Failing marks the CronJob run as failed so it gets looked at. Dry runs fail too: the prod dry run is the rehearsal.
  const blockingIssues = findBlockingIssues(report);
  monitoring?.trackEvent(SYNC_RUN_EVENT, buildRunProperties(name, blockingIssues.length > 0 ? "blocking" : "clean", report, blockingIssues));
  if (blockingIssues.length > 0) {
    throw new Error(`${title} found ${blockingIssues.length} blocking issues`);
  }
}

function buildRunProperties(name: string, outcome: RunOutcome, report: SyncReport, blockingIssues: string[]): Record<string, string> {
  const blockingReasons = Object.fromEntries([...Map.groupBy(blockingIssues, (reason) => reason)].map(([reason, grouped]) => [reason, grouped.length]));

  return {
    sync: name,
    outcome,
    isDryRun: String(report.isDryRun),
    blockingIssues: String(blockingIssues.length),
    blockingReasons: truncate(JSON.stringify(blockingReasons)),
    ...Object.fromEntries(
      report.domains.flatMap((domain) => [
        [`${domain.entityType}.read`, String(domain.read)],
        [`${domain.entityType}.existing`, String(domain.existing)],
        [`${domain.entityType}.loaded`, String(domain.loaded)],
        [`${domain.entityType}.rejected`, String(domain.rejections.length)]
      ])
    ),
    ...Object.fromEntries(
      report.steps.flatMap((step) => [
        [`${step.name}.processed`, String(step.processed)],
        [`${step.name}.rejected`, String(step.rejections.length)],
        ...(step.skipped ? [[`${step.name}.skipped`, step.skipped]] : [])
      ])
    )
  };
}

function truncate(value: string): string {
  return value.length > MAX_PROPERTY_LENGTH ? `${value.slice(0, MAX_PROPERTY_LENGTH)}…` : value;
}

export interface SyncJob {
  // Stable identifier for the event, e.g. "accounts"; title is the human-readable log heading.
  name: string;
  title: string;
  run: () => Promise<SyncReport>;
}

// The crons runner's MonitoringService satisfies this; kept narrow so this lib does not depend on it.
export interface SyncMonitoring {
  trackEvent(name: string, properties: Record<string, string>): void;
}

type RunOutcome = "clean" | "blocking" | "aborted";
