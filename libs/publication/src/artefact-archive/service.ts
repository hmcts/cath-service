import { deleteArtefactBlobs } from "../repository/queries.js";
import { archiveAndDeleteArtefact, deleteArtefactArchiveOnOrBefore, type ExpiredArtefact, findExpiredArtefacts } from "./queries.js";

const EXPIRED_ARTEFACT_BATCH_SIZE = 100;
const ARTEFACT_ARCHIVE_RETENTION_MONTHS = 3;
const LOG_PREFIX = "[ExpiredArtefacts]";

// Keyset pagination: artefacts whose transaction fails stay in the table, so re-reading the first page would never end.
export async function archiveExpiredArtefacts(now: Date = new Date()): Promise<ArchiveSummary> {
  let archived = 0;
  const failed: ArchiveFailure[] = [];
  let cursor: string | undefined;
  let page: ExpiredArtefact[];

  do {
    page = await findExpiredArtefacts(now, cursor, EXPIRED_ARTEFACT_BATCH_SIZE);

    for (const artefact of page) {
      const failure = await archiveArtefact(artefact);
      if (failure) {
        failed.push(failure);
      }
      // A blob failure happens after the commit, so the artefact is still archived.
      if (failure?.stage !== "database") {
        archived++;
      }
    }

    cursor = page.at(-1)?.artefactId;
  } while (page.length === EXPIRED_ARTEFACT_BATCH_SIZE);

  return { searchDate: now, archived, failed };
}

export async function purgeArtefactArchive(now: Date = new Date()): Promise<PurgeSummary> {
  const cutoff = subtractMonthsUtc(now, ARTEFACT_ARCHIVE_RETENTION_MONTHS);
  const deleted = await deleteArtefactArchiveOnOrBefore(cutoff);
  return { cutoff, deleted };
}

// The DB rows go first: a later blob failure only orphans blobs, whereas the reverse would leave rows pointing at missing data.
async function archiveArtefact(artefact: ExpiredArtefact): Promise<ArchiveFailure | undefined> {
  const { artefactId } = artefact;

  try {
    await archiveAndDeleteArtefact(artefact);
  } catch (error) {
    return recordFailure(artefactId, "database", error);
  }

  try {
    await deleteArtefactBlobs(artefactId, artefact.sourceArtefactId);
  } catch (error) {
    return recordFailure(artefactId, "blob", error);
  }

  return undefined;
}

function recordFailure(artefactId: string, stage: ArchiveFailure["stage"], error: unknown): ArchiveFailure {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${LOG_PREFIX} Failed to archive artefact:`, { artefactId, stage, error: message });
  return { artefactId, stage, message };
}

// Calendar months in UTC, clamped to the last day of the target month (31 May -> 28/29 Feb, not 3 Mar).
function subtractMonthsUtc(from: Date, months: number): Date {
  const firstOfTargetMonth = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - months, 1));
  const year = firstOfTargetMonth.getUTCFullYear();
  const month = firstOfTargetMonth.getUTCMonth();
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(from.getUTCDate(), lastDayOfTargetMonth),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds()
    )
  );
}

export interface ArchiveFailure {
  artefactId: string;
  stage: "database" | "blob";
  message: string;
}

export interface ArchiveSummary {
  searchDate: Date;
  archived: number;
  failed: ArchiveFailure[];
}

export interface PurgeSummary {
  cutoff: Date;
  deleted: number;
}
