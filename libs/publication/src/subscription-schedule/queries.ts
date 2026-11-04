import { prisma } from "@hmcts/postgres-prisma";
import { isNoMatchLocationId } from "../no-match-location.js";
import type { LondonDay } from "./london-day.js";
import { SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES } from "./scheduled-list-types.js";

const SCHEDULED_ARTEFACT_SELECT = {
  artefactId: true,
  locationId: true,
  listTypeId: true,
  contentDate: true,
  language: true,
  isFlatFile: true,
  listType: { select: { name: true } }
} as const;

export async function findArtefactsDisplayedFromToday(day: LondonDay, now: Date): Promise<ScheduledArtefact[]> {
  const rows = await prisma.artefact.findMany({
    where: {
      displayFrom: { gte: day.start, lt: day.end },
      OR: notExpired(now),
      // Artefacts received today were already notified by the upload path.
      lastReceivedDate: { lt: day.start },
      listType: { name: { notIn: SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES } }
    },
    select: SCHEDULED_ARTEFACT_SELECT
  });

  return toScheduledArtefacts(rows);
}

export async function findScheduledListTypeArtefactsForToday(day: LondonDay, now: Date): Promise<ScheduledArtefact[]> {
  const rows = await prisma.artefact.findMany({
    where: {
      listType: { name: { in: SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES } },
      contentDate: day.contentDate,
      OR: notExpired(now)
    },
    select: SCHEDULED_ARTEFACT_SELECT
  });

  return toScheduledArtefacts(rows);
}

function notExpired(now: Date) {
  return [{ displayTo: null }, { displayTo: { gt: now } }];
}

function toScheduledArtefacts(rows: ScheduledArtefactRow[]): ScheduledArtefact[] {
  return rows
    .filter((row) => !isNoMatchLocationId(row.locationId))
    .map((row) => ({
      artefactId: row.artefactId,
      locationId: row.locationId,
      listTypeId: row.listTypeId,
      listTypeName: row.listType.name,
      contentDate: row.contentDate,
      language: row.language,
      isFlatFile: row.isFlatFile
    }));
}

interface ScheduledArtefactRow {
  artefactId: string;
  locationId: string;
  listTypeId: number;
  contentDate: Date;
  language: string;
  isFlatFile: boolean;
  listType: { name: string };
}

export interface ScheduledArtefact {
  artefactId: string;
  locationId: string;
  listTypeId: number;
  listTypeName: string;
  contentDate: Date;
  language: string;
  isFlatFile: boolean;
}
