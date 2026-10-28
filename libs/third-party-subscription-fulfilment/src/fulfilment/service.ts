import { getLocationWithDetails } from "@hmcts/location";
import { loadFlatFile } from "../delivery/flat-file.js";
import { type DeliveryRequest, sendRequest } from "../delivery/http-client.js";
import { buildMultipartBody, type MultipartPart } from "../delivery/multipart.js";
import { withRetry } from "../delivery/retry.js";
import { getAccessToken } from "../oauth/access-token.js";
import { getDestinationUrl } from "../oauth/oauth-config.js";
import { type FulfilmentArtefact, findArtefactForFulfilment, findListTypeName, findMatchingSubscriptions, type Subscriber } from "./queries.js";

const DEFAULT_LOG_PREFIX = "[ThirdPartySubscriptionFulfilment]";
const TIME_ZONE = "Europe/London";
const JSON_CONTENT_TYPE = "application/json";
// Legacy sends the file as a ByteArrayResource with no filename, which Spring always types as octet-stream
const FILE_CONTENT_TYPE = "application/octet-stream";

// Legacy ThirdPartySubscriptionNotificationService.determineAllowedApiSensitivities
const ALLOWED_SUBSCRIPTION_SENSITIVITIES: Record<string, string[]> = {
  PUBLIC: ["PUBLIC", "PRIVATE", "CLASSIFIED"],
  PRIVATE: ["PRIVATE", "CLASSIFIED"],
  CLASSIFIED: ["CLASSIFIED"]
};

const LONDON_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

export async function sendPublicationToThirdParties(params: PublicationFulfilmentParams): Promise<void> {
  const { artefactId, isUpdate, jsonData, logPrefix = DEFAULT_LOG_PREFIX } = params;

  const artefact = await findArtefactForFulfilment(artefactId);
  if (!artefact) {
    console.error(`${logPrefix} Third-party fulfilment skipped: artefact not found`, { artefactId });
    return;
  }

  if (!isWithinDisplayWindow(artefact, new Date())) {
    console.info(`${logPrefix} Third-party fulfilment skipped: publication is outside its display window`, { artefactId });
    return;
  }

  const subscribers = await findSubscribers(artefact.listType.name, artefact.sensitivity, artefactId, logPrefix);
  if (subscribers.length === 0) {
    return;
  }

  const contentPart = await buildContentPart(artefact, jsonData, logPrefix);
  if (!contentPart) {
    return;
  }

  const metadataPart: MultipartPart = {
    name: "metadata",
    contentType: JSON_CONTENT_TYPE,
    content: JSON.stringify(await buildMetadata(artefact, logPrefix))
  };
  const { body, contentType } = buildMultipartBody([metadataPart, contentPart]);
  const method = isUpdate ? "PUT" : "POST";

  await Promise.all(
    subscribers.map((subscriber) =>
      deliverToSubscriber(
        subscriber,
        artefactId,
        (destinationUrl) => ({ method, url: isUpdate ? `${destinationUrl}/${artefactId}` : destinationUrl, body, contentType }),
        logPrefix
      )
    )
  );
}

export async function sendPublicationDeletionToThirdParties(params: PublicationDeletionParams): Promise<void> {
  const { artefactId, listTypeId, sensitivity, logPrefix = DEFAULT_LOG_PREFIX } = params;

  const listTypeName = await findListTypeName(listTypeId);
  if (!listTypeName) {
    console.info(`${logPrefix} Third-party deletion skipped: list type not found`, { artefactId });
    return;
  }

  const subscribers = await findSubscribers(listTypeName, sensitivity, artefactId, logPrefix);

  await Promise.all(
    subscribers.map((subscriber) =>
      deliverToSubscriber(subscriber, artefactId, (destinationUrl) => ({ method: "DELETE", url: `${destinationUrl}/${artefactId}` }), logPrefix)
    )
  );
}

// Legacy compares the stored display dates (LocalDateTime.toLocalDate) against today's date in Europe/London
function isWithinDisplayWindow(artefact: FulfilmentArtefact, now: Date): boolean {
  const today = LONDON_DATE_FORMAT.format(now);
  const isDisplayFromReached = !artefact.displayFrom || toStoredDate(artefact.displayFrom) <= today;
  const isDisplayToNotPassed = !artefact.displayTo || toStoredDate(artefact.displayTo) >= today;
  return isDisplayFromReached && isDisplayToNotPassed;
}

// Display dates are timestamp-without-time-zone columns, which Prisma reads as UTC, so the UTC fields are the stored value
function toStoredDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function findSubscribers(listTypeName: string, sensitivity: string, artefactId: string, logPrefix: string): Promise<Subscriber[]> {
  const allowedSensitivities = ALLOWED_SUBSCRIPTION_SENSITIVITIES[sensitivity] ?? [];
  const subscribers = allowedSensitivities.length > 0 ? await findMatchingSubscriptions(listTypeName, allowedSensitivities) : [];

  if (subscribers.length === 0) {
    console.info(`${logPrefix} Third-party fulfilment skipped: no matching subscribers`, { artefactId, listTypeName, sensitivity });
  }

  return subscribers;
}

async function buildContentPart(artefact: FulfilmentArtefact, jsonData: unknown, logPrefix: string): Promise<MultipartPart | null> {
  if (artefact.isFlatFile) {
    const flatFile = await loadFlatFile(artefact.artefactId, artefact.sourceArtefactId);
    if (!flatFile) {
      console.error(`${logPrefix} Third-party fulfilment skipped: flat file not found in blob storage`, { artefactId: artefact.artefactId });
      return null;
    }
    return { name: "file", contentType: FILE_CONTENT_TYPE, content: flatFile.buffer, fileName: flatFile.fileName };
  }

  if (jsonData == null) {
    console.error(`${logPrefix} Third-party fulfilment skipped: no JSON payload for publication`, { artefactId: artefact.artefactId });
    return null;
  }

  return { name: "payload", contentType: JSON_CONTENT_TYPE, content: JSON.stringify(jsonData) };
}

// Legacy ThirdPartyPublicationMetadata
async function buildMetadata(artefact: FulfilmentArtefact, logPrefix: string): Promise<PublicationMetadata> {
  const location = await getLocationWithDetails(Number.parseInt(artefact.locationId, 10));
  if (!location) {
    console.warn(`${logPrefix} Location not found for third-party metadata`, { artefactId: artefact.artefactId, locationId: artefact.locationId });
  }

  return {
    publicationId: artefact.artefactId,
    listType: artefact.listType.name,
    locationName: location?.name ?? "",
    contentDate: toLocalDateTimeArray(artefact.contentDate),
    sensitivity: artefact.sensitivity,
    language: artefact.language,
    displayFrom: artefact.displayFrom ? toLocalDateTimeArray(artefact.displayFrom) : null,
    displayTo: artefact.displayTo ? toLocalDateTimeArray(artefact.displayTo) : null
  };
}

// Legacy's WebClient uses Spring's default Jackson mapper, which writes LocalDateTime as an array:
// [year, month, day, hour, minute], then seconds and nanoseconds only when they are non-zero.
// The columns are stored without a time zone and read by Prisma as UTC, so the UTC fields are the stored value.
function toLocalDateTimeArray(date: Date): number[] {
  const dateTime = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()];
  const seconds = date.getUTCSeconds();
  const nanoseconds = date.getUTCMilliseconds() * 1_000_000;

  if (nanoseconds > 0) {
    return [...dateTime, seconds, nanoseconds];
  }
  return seconds > 0 ? [...dateTime, seconds] : dateTime;
}

async function deliverToSubscriber(
  { id: userId, name }: Subscriber,
  publicationId: string,
  buildRequest: (destinationUrl: string) => Omit<DeliveryRequest, "accessToken">,
  logPrefix: string
): Promise<void> {
  try {
    const destinationUrl = await getDestinationUrl(name, userId);
    if (!destinationUrl) {
      console.error(`${logPrefix} Third-party subscriber skipped: no destination URL configured`, { userId });
      return;
    }

    // Legacy still sends the request when no token could be obtained
    const accessToken = await getAccessToken(name, userId);
    const request: DeliveryRequest = { ...buildRequest(destinationUrl), accessToken };

    const isDelivered = await withRetry(
      () => sendRequest(request),
      `${logPrefix} Third-party ${request.method} for user ${userId}, publication ${publicationId}:`
    );
    if (isDelivered) {
      console.info(`${logPrefix} Third-party ${request.method} sent`, { userId, publicationId });
    } else {
      console.error(`${logPrefix} Third-party ${request.method} failed after retries`, { userId, publicationId });
    }
  } catch (error) {
    console.error(`${logPrefix} Third-party delivery failed`, { userId, publicationId, error: error instanceof Error ? error.message : String(error) });
  }
}

interface PublicationFulfilmentParams {
  artefactId: string;
  isUpdate: boolean;
  jsonData?: unknown;
  logPrefix?: string;
}

interface PublicationDeletionParams {
  artefactId: string;
  listTypeId: number;
  sensitivity: string;
  logPrefix?: string;
}

interface PublicationMetadata {
  publicationId: string;
  listType: string;
  locationName: string;
  contentDate: number[];
  sensitivity: string;
  language: string;
  displayFrom: number[] | null;
  displayTo: number[] | null;
}
