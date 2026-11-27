import { archiveExpiredArtefacts, purgeArtefactArchive } from "@hmcts/publication";
import { closeConnections } from "./close-connections.js";

const LOG_PREFIX = "[ExpiredArtefacts]";

export default async function expiredArtefacts() {
  try {
    const archive = await archiveExpiredArtefacts();
    console.info(`${LOG_PREFIX} Archived ${archive.archived} artefacts with display_to before ${archive.searchDate.toISOString()}`);
    for (const failure of archive.failed) {
      console.error(`${LOG_PREFIX} Artefact ${failure.artefactId} failed at the ${failure.stage} stage: ${failure.message}`);
    }

    // Archiving failures are per artefact and must not hold back retention of the archive table.
    const purge = await purgeArtefactArchive();
    console.info(`${LOG_PREFIX} Deleted ${purge.deleted} artefact_archive rows archived on or before ${purge.cutoff.toISOString()}`);

    if (archive.failed.length > 0) {
      throw new Error(`${archive.failed.length} artefact(s) failed to archive cleanly`);
    }
  } finally {
    await closeConnections();
  }
}
