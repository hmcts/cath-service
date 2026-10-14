import { runLegacySync, runSyncJob, type SyncMonitoring } from "@hmcts/legacy-migration";

const DEFAULT_MAX_DROP_RATIO = 0.05;

export const legacySync = async (monitoring?: SyncMonitoring) => {
  const legacyAccountDatabaseUrl = process.env.LEGACY_ACCOUNT_DATABASE_URL;
  if (!legacyAccountDatabaseUrl) {
    throw new Error("LEGACY_ACCOUNT_DATABASE_URL is required");
  }

  // Writes only when explicitly switched on, so a misconfigured job can never modify data.
  const isDryRun = process.env.LEGACY_SYNC_APPLY !== "true";
  const maxDropRatio = Number(process.env.LEGACY_SYNC_MAX_DROP_RATIO ?? DEFAULT_MAX_DROP_RATIO);

  await runSyncJob(
    { name: "accounts", title: "Legacy account sync", run: () => runLegacySync({ legacyAccountDatabaseUrl, isDryRun, maxDropRatio }) },
    monitoring
  );
};

export default legacySync;
