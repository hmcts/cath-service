import { runPublicationSync, runSyncJob, type SyncMonitoring } from "@hmcts/legacy-migration";

const DEFAULT_MAX_DROP_RATIO = 0.05;

export const legacySyncPublications = async (monitoring?: SyncMonitoring) => {
  const legacyPublicationDatabaseUrl = process.env.LEGACY_PUBLICATION_DATABASE_URL;
  if (!legacyPublicationDatabaseUrl) {
    throw new Error("LEGACY_PUBLICATION_DATABASE_URL is required");
  }

  // Writes only when explicitly switched on, so a misconfigured job can never modify data.
  const isDryRun = process.env.LEGACY_SYNC_APPLY !== "true";
  const maxDropRatio = Number(process.env.LEGACY_SYNC_MAX_DROP_RATIO ?? DEFAULT_MAX_DROP_RATIO);

  await runSyncJob(
    { name: "publications", title: "Legacy publication sync", run: () => runPublicationSync({ legacyPublicationDatabaseUrl, isDryRun, maxDropRatio }) },
    monitoring
  );
};

export default legacySyncPublications;
