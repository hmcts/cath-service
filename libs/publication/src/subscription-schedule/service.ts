import { getPublicationJson } from "../file-storage/file-retrieval.js";
import { sendPublicationNotificationsForArtefact } from "../processing/service.js";
import { getLondonDay } from "./london-day.js";
import { findArtefactsDisplayedFromToday, findScheduledListTypeArtefactsForToday, type ScheduledArtefact } from "./queries.js";

const LOG_PREFIX = "[SubscriptionSchedule]";

export async function triggerDisplayFromSubscriptions(now: Date = new Date()): Promise<TriggerSummary> {
  const artefacts = await findArtefactsDisplayedFromToday(getLondonDay(now), now);
  return notifyAll(artefacts);
}

export async function triggerScheduledListTypeSubscriptions(now: Date = new Date()): Promise<TriggerSummary> {
  const artefacts = await findScheduledListTypeArtefactsForToday(getLondonDay(now), now);
  return notifyAll(artefacts);
}

// Sequential so Notify load stays flat and one artefact's failure is isolated from the rest.
async function notifyAll(artefacts: ScheduledArtefact[]): Promise<TriggerSummary> {
  let succeeded = 0;
  for (const artefact of artefacts) {
    if (await notifyArtefact(artefact)) {
      succeeded++;
    }
  }
  return { total: artefacts.length, succeeded, failed: artefacts.length - succeeded };
}

async function notifyArtefact(artefact: ScheduledArtefact): Promise<boolean> {
  const { artefactId, listTypeName } = artefact;

  try {
    const jsonData = artefact.isFlatFile ? undefined : await getPublicationJson(artefactId);
    if (!artefact.isFlatFile && jsonData === null) {
      throw new Error("Publication JSON not found in blob storage");
    }

    const result = await sendPublicationNotificationsForArtefact({
      artefactId,
      locationId: artefact.locationId,
      listTypeId: artefact.listTypeId,
      contentDate: artefact.contentDate,
      jsonData,
      pdfFilePath: `${artefactId}.pdf`,
      locale: artefact.language === "WELSH" ? "cy" : "en",
      logPrefix: LOG_PREFIX
    });
    if (!result.success) {
      throw new Error("Subscription notifications were not sent");
    }

    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to trigger subscriptions for artefact:`, {
      artefactId,
      listTypeName,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

export interface TriggerSummary {
  total: number;
  succeeded: number;
  failed: number;
}
