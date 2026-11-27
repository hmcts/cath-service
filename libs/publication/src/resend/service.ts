import { sendThirdPartyPublications } from "@hmcts/legacy-third-party-fulfilment";
import { sendPublicationToThirdParties } from "@hmcts/third-party-subscription-fulfilment";
import { getPublicationJson } from "../file-storage/file-retrieval.js";
import { sendPublicationNotificationsForArtefact } from "../processing/service.js";
import type { ArtefactWithListType } from "../repository/model.js";
import { getArtefactById } from "../repository/queries.js";
import type { ResendAction } from "./resend-action.js";

const LOG_PREFIX = "[BlobExplorerResend]";
const MANUAL_COURTEL_MAX_ATTEMPTS = 1;

const CHANNELS_BY_ACTION: Record<ResendAction, ResendChannel[]> = {
  resubmit: ["courtel", "third-party", "email"],
  courtel: ["courtel"],
  "third-party": ["third-party"],
  email: ["email"]
};

export async function resendPublication(artefactId: string, action: ResendAction): Promise<ResendResult> {
  const artefact = await getArtefactById(artefactId);
  if (!artefact) {
    return { status: "not-found" };
  }

  const jsonData = artefact.isFlatFile ? undefined : await loadJsonData(artefactId);
  const channelNames = CHANNELS_BY_ACTION[action];

  const settled = await Promise.allSettled(channelNames.map((channel) => sendToChannel(channel, artefact, jsonData)));

  const results = channelNames.map((channel, index): ChannelSendResult & { channel: ResendChannel } => {
    const result = settled[index];
    if (result.status === "rejected") {
      console.error(`${LOG_PREFIX} ${channel} send failed:`, {
        artefactId,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason)
      });
      return { channel, outcome: "failed" };
    }
    return { channel, ...result.value };
  });

  const channels: Partial<Record<ResendChannel, ChannelOutcome>> = Object.fromEntries(results.map(({ channel, outcome }) => [channel, outcome]));
  const emailCounts = results.find((result) => result.emailCounts)?.emailCounts;

  return { status: summariseOutcomes(Object.values(channels)), channels, ...(emailCounts ? { emailCounts } : {}) };
}

async function loadJsonData(artefactId: string): Promise<unknown> {
  try {
    const jsonData = await getPublicationJson(artefactId);
    if (jsonData == null) {
      console.warn(`${LOG_PREFIX} JSON payload not found for publication`, { artefactId });
      return undefined;
    }
    return jsonData;
  } catch (error) {
    console.warn(`${LOG_PREFIX} Could not load JSON payload for publication`, {
      artefactId,
      error: error instanceof Error ? error.message : String(error)
    });
    return undefined;
  }
}

async function sendToChannel(channel: ResendChannel, artefact: ArtefactWithListType, jsonData: unknown): Promise<ChannelSendResult> {
  switch (channel) {
    case "courtel":
      return { outcome: await sendCourtel(artefact, jsonData) };
    case "third-party":
      return { outcome: await sendThirdParty(artefact, jsonData) };
    case "email":
      return sendEmails(artefact, jsonData);
  }
}

function sendCourtel(artefact: ArtefactWithListType, jsonData: unknown): Promise<ChannelOutcome> {
  return sendThirdPartyPublications({
    artefactId: artefact.artefactId,
    locationId: artefact.locationId,
    listTypeId: artefact.listTypeId,
    contentDate: artefact.contentDate,
    sensitivity: artefact.sensitivity,
    language: artefact.language,
    displayFrom: artefact.displayFrom,
    displayTo: artefact.displayTo,
    provenance: artefact.provenance,
    isUpdate: false,
    jsonData,
    maxAttempts: MANUAL_COURTEL_MAX_ATTEMPTS,
    logPrefix: LOG_PREFIX
  });
}

function sendThirdParty(artefact: ArtefactWithListType, jsonData: unknown): Promise<ChannelOutcome> {
  return sendPublicationToThirdParties({
    artefactId: artefact.artefactId,
    isUpdate: true,
    jsonData,
    ignoreDisplayWindow: true,
    logPrefix: LOG_PREFIX
  });
}

async function sendEmails(artefact: ArtefactWithListType, jsonData: unknown): Promise<ChannelSendResult> {
  const result = await sendPublicationNotificationsForArtefact({
    artefactId: artefact.artefactId,
    locationId: artefact.locationId,
    listTypeId: artefact.listTypeId,
    contentDate: artefact.contentDate,
    jsonData,
    pdfFilePath: `${artefact.artefactId}.pdf`,
    locale: artefact.language === "WELSH" ? "cy" : "en",
    logPrefix: LOG_PREFIX
  });

  if (!result.success) return { outcome: "failed" };

  const emailCounts = { sent: result.sent ?? 0, failed: result.failed ?? 0 };
  if (!result.totalSubscriptions) return { outcome: "no-recipients", emailCounts };
  if (emailCounts.sent === 0) return { outcome: emailCounts.failed > 0 ? "failed" : "no-recipients", emailCounts };
  return { outcome: "sent", emailCounts };
}

function summariseOutcomes(outcomes: ChannelOutcome[]): ChannelOutcome {
  if (outcomes.includes("failed")) return "failed";
  if (outcomes.every((outcome) => outcome === "no-recipients")) return "no-recipients";
  return "sent";
}

export type ResendChannel = "courtel" | "third-party" | "email";

export type ChannelOutcome = "sent" | "no-recipients" | "failed";

export type ResendResult =
  | { status: "not-found" }
  | { status: ChannelOutcome; channels: Partial<Record<ResendChannel, ChannelOutcome>>; emailCounts?: EmailCounts };

interface EmailCounts {
  sent: number;
  failed: number;
}

interface ChannelSendResult {
  outcome: ChannelOutcome;
  emailCounts?: EmailCounts;
}
