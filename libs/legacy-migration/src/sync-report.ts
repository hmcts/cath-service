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

  return lines.join("\n");
}

// Rejections carry ids and reasons only, never emails or names, so the counts are safe to log.
function formatReasons(rejections: Rejection[]): string[] {
  return [...Map.groupBy(rejections, (rejection) => rejection.reason)].map(([reason, grouped]) => `  ${grouped.length} x ${reason}`);
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
