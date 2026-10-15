import { isAcceptedRejection } from "./rejection-policy.js";

export function formatSyncReport(title: string, report: SyncReport): string {
  const lines = [`${title} ${report.isDryRun ? "(dry run)" : "(applied)"}`];

  for (const domain of report.domains) {
    lines.push(`${domain.entityType}: read=${domain.read} existing=${domain.existing} loaded=${domain.loaded} rejected=${domain.rejections.length}`);
    if (domain.dropLimitViolation) {
      lines.push(`  WOULD BE REFUSED: ${domain.dropLimitViolation}`);
    }
    lines.push(...formatReasons(domain.rejections));
  }

  for (const step of report.steps) {
    lines.push(step.skipped ? `${step.name}: skipped (${step.skipped})` : `${step.name}: processed=${step.processed} rejected=${step.rejections.length}`);
    lines.push(...formatReasons(step.rejections));
  }

  lines.push(`blocking issues: ${findBlockingIssues(report).length}`);

  return lines.join("\n");
}

// A run is clean when it has no blocking issues. Accepted rejections recur every night by design
// (rejection-policy.ts), so counting them would mean no run is ever clean.
export function findBlockingIssues(report: SyncReport): string[] {
  const blockingReasons = [...report.domains, ...report.steps]
    .flatMap((section) => section.rejections)
    .filter((rejection) => !isAcceptedRejection(rejection.reason))
    .map((rejection) => rejection.reason);
  const dropLimitViolations = report.domains.flatMap((domain) => (domain.dropLimitViolation ? [domain.dropLimitViolation] : []));

  return [...dropLimitViolations, ...blockingReasons];
}

// An applied run that aborts rolls back, so it returns no report. This carries the report built
// before the abort, so the cron entry can still log what the run read and rejected.
export class SyncAbortedError extends Error {
  constructor(
    message: string,
    readonly report: SyncReport
  ) {
    super(message);
    this.name = "SyncAbortedError";
  }
}

// Rejections carry ids and reasons only, never emails or names, so the counts are safe to log.
function formatReasons(rejections: Rejection[]): string[] {
  return [...Map.groupBy(rejections, (rejection) => rejection.reason)].map(
    ([reason, grouped]) => `  ${grouped.length} x ${reason}${isAcceptedRejection(reason) ? " (accepted)" : ""}`
  );
}

export interface SyncReport {
  isDryRun: boolean;
  domains: DomainReport[];
  steps: StepReport[];
}

export interface DomainReport {
  entityType: string;
  read: number;
  // Rows in this service before the reload replaced them.
  existing: number;
  loaded: number;
  rejections: Rejection[];
  // Set when the row-count guard would refuse this reload. Fails an applied run; reported in a dry run.
  dropLimitViolation: string | null;
}

export interface Rejection {
  entityId: string;
  reason: string;
}

// Work outside the database transaction: file and secret copies, derived publication data.
export interface StepReport {
  name: string;
  processed: number;
  rejections: Rejection[];
  skipped?: string;
}

export interface DomainTransform<T> {
  rows: T[];
  rejections: Rejection[];
}
