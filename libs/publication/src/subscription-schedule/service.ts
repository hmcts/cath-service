import type { ThirdPartyPushOutcome } from "@hmcts/legacy-third-party-fulfilment";
import { getPublicationJson } from "../file-storage/file-retrieval.js";
import { pushPublicationToThirdParties, sendPublicationNotificationsForArtefact } from "../processing/service.js";
import { getLondonDay } from "./london-day.js";
import { findArtefactsDisplayedFromToday, findScheduledListTypeArtefactsForToday, type ScheduledArtefact } from "./queries.js";
import { SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES } from "./scheduled-list-types.js";

const LOG_PREFIX = "[SubscriptionSchedule]";

export async function triggerDisplayFromSubscriptions(now: Date = new Date()): Promise<DisplayFromTriggerSummary> {
  const artefacts = await findArtefactsDisplayedFromToday(getLondonDay(now), now);
  // As legacy: scheduled list types go to API subscribers only here, because the scheduled run sends their email.
  const emailArtefacts = artefacts.filter((artefact) => !SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES.includes(artefact.listTypeName));

  const email = await notifyAll(emailArtefacts);
  const thirdParty = await pushAllToThirdParties(artefacts);
  return { email, thirdParty };
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
    const jsonData = await loadPublicationJson(artefact);

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

// Sequential for the same reasons as notifyAll; the push already retries each request itself.
async function pushAllToThirdParties(artefacts: ScheduledArtefact[]): Promise<ThirdPartyTriggerSummary> {
  const summary: ThirdPartyTriggerSummary = { total: artefacts.length, sent: 0, skipped: 0, failed: 0 };
  for (const artefact of artefacts) {
    summary[await pushArtefact(artefact)]++;
  }
  return summary;
}

async function pushArtefact(artefact: ScheduledArtefact): Promise<ThirdPartyPushOutcome> {
  const { artefactId, listTypeName } = artefact;

  try {
    return await pushPublicationToThirdParties({
      artefactId,
      locationId: artefact.locationId,
      listTypeId: artefact.listTypeId,
      contentDate: artefact.contentDate,
      sensitivity: artefact.sensitivity,
      language: artefact.language,
      displayFrom: artefact.displayFrom,
      displayTo: artefact.displayTo,
      provenance: artefact.provenance,
      // The upload path did not push it, so Courtel has never seen this publication.
      isUpdate: false,
      jsonData: await loadPublicationJson(artefact),
      pdfBlobName: `${artefactId}.pdf`,
      logPrefix: LOG_PREFIX
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to push artefact to third parties:`, {
      artefactId,
      listTypeName,
      error: error instanceof Error ? error.message : String(error)
    });
    return "failed";
  }
}

async function loadPublicationJson(artefact: ScheduledArtefact): Promise<unknown> {
  if (artefact.isFlatFile) {
    return undefined;
  }

  const jsonData = await getPublicationJson(artefact.artefactId);
  if (jsonData === null) {
    throw new Error("Publication JSON not found in blob storage");
  }
  return jsonData;
}

export interface TriggerSummary {
  total: number;
  succeeded: number;
  failed: number;
}

export interface ThirdPartyTriggerSummary {
  total: number;
  sent: number;
  skipped: number;
  failed: number;
}

export interface DisplayFromTriggerSummary {
  email: TriggerSummary;
  thirdParty: ThirdPartyTriggerSummary;
}
