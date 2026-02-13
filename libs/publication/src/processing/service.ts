import { type CauseListData, generateCauseListPdf } from "@hmcts/civil-and-family-daily-cause-list";
import { getLocationById } from "@hmcts/location";
import { sendPublicationNotifications } from "@hmcts/notifications";
import { mockListTypes } from "../index.js";

const LIST_TYPE_CIVIL_AND_FAMILY_DAILY_CAUSE_LIST = 8;

interface GeneratePdfParams {
  artefactId: string;
  listTypeId: number;
  contentDate: Date;
  locale: string;
  locationId: string;
  jsonData: CauseListData;
  provenance?: string;
  logPrefix?: string;
}

interface GeneratePdfResult {
  pdfPath?: string;
  sizeBytes?: number;
  exceedsMaxSize?: boolean;
}

export async function generatePublicationPdf(params: GeneratePdfParams): Promise<GeneratePdfResult> {
  const { artefactId, listTypeId, contentDate, locale, locationId, jsonData, provenance, logPrefix = "[Publication]" } = params;

  if (listTypeId !== LIST_TYPE_CIVIL_AND_FAMILY_DAILY_CAUSE_LIST) {
    return {};
  }

  try {
    const pdfResult = await generateCauseListPdf({
      artefactId,
      contentDate,
      locale,
      locationId,
      jsonData,
      provenance
    });

    if (pdfResult.success && pdfResult.pdfPath) {
      return {
        pdfPath: pdfResult.pdfPath,
        sizeBytes: pdfResult.sizeBytes,
        exceedsMaxSize: pdfResult.exceedsMaxSize
      };
    }

    console.warn(`${logPrefix} PDF generation failed:`, { artefactId, error: pdfResult.error });
    return {};
  } catch (error) {
    console.error(`${logPrefix} PDF generation error:`, { artefactId, error: error instanceof Error ? error.message : String(error) });
    return {};
  }
}

interface SendNotificationsParams {
  artefactId: string;
  locationId: string;
  listTypeId: number;
  contentDate: Date;
  jsonData?: unknown;
  pdfFilePath?: string;
  logPrefix?: string;
}

interface SendNotificationsResult {
  success: boolean;
  totalSubscriptions?: number;
  sent?: number;
  failed?: number;
  skipped?: number;
}

export async function sendPublicationNotificationsForArtefact(params: SendNotificationsParams): Promise<SendNotificationsResult> {
  const { artefactId, locationId, listTypeId, contentDate, jsonData, pdfFilePath, logPrefix = "[Publication]" } = params;

  try {
    const locationIdNum = Number.parseInt(locationId, 10);
    if (Number.isNaN(locationIdNum)) {
      console.error(`${logPrefix} Invalid location ID for notifications:`, locationId);
      return { success: false };
    }

    const location = await getLocationById(locationIdNum);
    if (!location) {
      console.warn(`${logPrefix} Location not found for notifications:`, { locationId });
      return { success: false };
    }

    const listType = mockListTypes.find((lt) => lt.id === listTypeId);
    const listTypeFriendlyName = listType?.englishFriendlyName || `LIST_TYPE_${listTypeId}`;

    const result = await sendPublicationNotifications({
      publicationId: artefactId,
      locationId,
      locationName: location.name,
      hearingListName: listTypeFriendlyName,
      publicationDate: contentDate,
      listTypeId,
      jsonData,
      pdfFilePath
    });

    if (result.errors.length > 0) {
      const sanitizedErrors = result.errors.map((error) => {
        const errorStr = typeof error === "string" ? error : JSON.stringify(error);
        return errorStr.replace(/\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]");
      });
      console.error(`${logPrefix} Notification errors:`, { count: result.errors.length, errors: sanitizedErrors });
    }

    return {
      success: true,
      totalSubscriptions: result.totalSubscriptions,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped
    };
  } catch (error) {
    console.error(`${logPrefix} Failed to send notifications:`, { artefactId, error: error instanceof Error ? error.message : String(error) });
    return { success: false };
  }
}

interface ProcessPublicationParams {
  artefactId: string;
  locationId: string;
  listTypeId: number;
  contentDate: Date;
  locale: string;
  jsonData?: CauseListData;
  provenance?: string;
  skipNotifications?: boolean;
  logPrefix?: string;
}

interface ProcessPublicationResult {
  pdfPath?: string;
  pdfSizeBytes?: number;
  pdfExceedsMaxSize?: boolean;
  notificationsSent?: number;
  notificationsFailed?: number;
}

export async function processPublication(params: ProcessPublicationParams): Promise<ProcessPublicationResult> {
  const { artefactId, locationId, listTypeId, contentDate, locale, jsonData, provenance, skipNotifications = false, logPrefix = "[Publication]" } = params;

  const result: ProcessPublicationResult = {};

  if (jsonData) {
    const pdfResult = await generatePublicationPdf({
      artefactId,
      listTypeId,
      contentDate,
      locale,
      locationId,
      jsonData,
      provenance,
      logPrefix
    });

    result.pdfPath = pdfResult.pdfPath;
    result.pdfSizeBytes = pdfResult.sizeBytes;
    result.pdfExceedsMaxSize = pdfResult.exceedsMaxSize;
  }

  if (!skipNotifications) {
    const notificationResult = await sendPublicationNotificationsForArtefact({
      artefactId,
      locationId,
      listTypeId,
      contentDate,
      jsonData,
      pdfFilePath: result.pdfPath,
      logPrefix
    });

    result.notificationsSent = notificationResult.sent;
    result.notificationsFailed = notificationResult.failed;
  }

  return result;
}
