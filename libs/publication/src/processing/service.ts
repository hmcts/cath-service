import { type AdministrativeCourtHearingList, generateAdministrativeCourtDailyCauseListPdf } from "@hmcts/administrative-court-daily-cause-list";
import { type CareStandardsTribunalHearingList, generateCareStandardsTribunalWeeklyHearingListPdf } from "@hmcts/care-standards-tribunal-weekly-hearing-list";
import { type CauseListData, generateCauseListPdf } from "@hmcts/civil-and-family-daily-cause-list";
import { type CourtOfAppealCivilData, generateCourtOfAppealCivilDailyCauseListPdf } from "@hmcts/court-of-appeal-civil-daily-cause-list";
import { getLocationById } from "@hmcts/location";
import { generateLondonAdministrativeCourtDailyCauseListPdf, type LondonAdminCourtData } from "@hmcts/london-administrative-court-daily-cause-list";
import { sendPublicationNotifications } from "@hmcts/notifications";
import { generateRcjStandardDailyCauseListPdf, type StandardHearingList } from "@hmcts/rcj-standard-daily-cause-list";
import { mockListTypes } from "../index.js";
import { getArtefactById } from "../repository/queries.js";

const LIST_TYPE_CIVIL_AND_FAMILY_DAILY_CAUSE_LIST = 8;
const LIST_TYPE_CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST = 9;
// RCJ Standard format list IDs (10-17)
const RCJ_STANDARD_LIST_IDS = [10, 11, 12, 13, 14, 15, 16, 17];
const LIST_TYPE_LONDON_ADMINISTRATIVE_COURT = 18;
const LIST_TYPE_COURT_OF_APPEAL_CIVIL = 19;
// Administrative Court list IDs (20-23)
const ADMINISTRATIVE_COURT_LIST_IDS = [20, 21, 22, 23];

interface GeneratePdfParams {
  artefactId: string;
  listTypeId: number;
  contentDate: Date;
  locale: string;
  locationId: string;
  jsonData: unknown;
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

  try {
    let pdfResult: { success: boolean; pdfPath?: string; sizeBytes?: number; exceedsMaxSize?: boolean; error?: string };

    if (listTypeId === LIST_TYPE_CIVIL_AND_FAMILY_DAILY_CAUSE_LIST) {
      pdfResult = await generateCauseListPdf({
        artefactId,
        contentDate,
        locale,
        locationId,
        jsonData: jsonData as CauseListData,
        provenance
      });
    } else if (listTypeId === LIST_TYPE_CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST) {
      const artefact = await getArtefactById(artefactId);
      if (!artefact) {
        console.warn(`${logPrefix} Artefact not found for PDF generation:`, { artefactId });
        return {};
      }

      pdfResult = await generateCareStandardsTribunalWeeklyHearingListPdf({
        artefactId,
        locale,
        locationId,
        jsonData: jsonData as CareStandardsTribunalHearingList,
        provenance,
        displayFrom: artefact.displayFrom,
        displayTo: artefact.displayTo
      });
    } else if (RCJ_STANDARD_LIST_IDS.includes(listTypeId)) {
      pdfResult = await generateRcjStandardDailyCauseListPdf({
        artefactId,
        contentDate,
        locale,
        locationId,
        jsonData: jsonData as StandardHearingList,
        provenance,
        listTypeId
      });
    } else if (listTypeId === LIST_TYPE_LONDON_ADMINISTRATIVE_COURT) {
      pdfResult = await generateLondonAdministrativeCourtDailyCauseListPdf({
        artefactId,
        contentDate,
        locale,
        locationId,
        jsonData: jsonData as LondonAdminCourtData,
        provenance
      });
    } else if (listTypeId === LIST_TYPE_COURT_OF_APPEAL_CIVIL) {
      pdfResult = await generateCourtOfAppealCivilDailyCauseListPdf({
        artefactId,
        contentDate,
        locale,
        locationId,
        jsonData: jsonData as CourtOfAppealCivilData,
        provenance
      });
    } else if (ADMINISTRATIVE_COURT_LIST_IDS.includes(listTypeId)) {
      pdfResult = await generateAdministrativeCourtDailyCauseListPdf({
        artefactId,
        contentDate,
        locale,
        locationId,
        jsonData: jsonData as AdministrativeCourtHearingList,
        provenance,
        listTypeId
      });
    } else {
      return {};
    }

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
  jsonData?: unknown;
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
