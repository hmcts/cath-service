import { findBlockingIssues, formatSyncReport, runLegacySync, SyncAbortedError } from "@hmcts/legacy-migration";

const DEFAULT_MAX_DROP_RATIO = 0.05;

export const legacySync = async () => {
  const legacyAccountDatabaseUrl = process.env.LEGACY_ACCOUNT_DATABASE_URL;
  if (!legacyAccountDatabaseUrl) {
    throw new Error("LEGACY_ACCOUNT_DATABASE_URL is required");
  }

  // Writes only when explicitly switched on, so a misconfigured job can never modify data.
  const isDryRun = process.env.LEGACY_SYNC_APPLY !== "true";
  const maxDropRatio = Number(process.env.LEGACY_SYNC_MAX_DROP_RATIO ?? DEFAULT_MAX_DROP_RATIO);

  const report = await runLegacySync({ legacyAccountDatabaseUrl, isDryRun, maxDropRatio }).catch((error: unknown) => {
    if (error instanceof SyncAbortedError) {
      console.log(formatSyncReport("Legacy account sync aborted", error.report));
    }
    throw error;
  });
  console.log(formatSyncReport("Legacy account sync", report));

  // The report is already logged; failing marks the CronJob run as failed so it gets looked at.
  const blockingIssues = findBlockingIssues(report);
  if (blockingIssues.length > 0) {
    throw new Error(`Legacy account sync found ${blockingIssues.length} blocking issues`);
  }
};

export default legacySync;
