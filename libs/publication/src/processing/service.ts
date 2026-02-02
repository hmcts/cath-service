import { type AdministrativeCourtHearingList, generateAdministrativeCourtDailyCauseListPdf } from "@hmcts/administrative-court-daily-cause-list";
import { type CareStandardsTribunalHearingList, generateCareStandardsTribunalWeeklyHearingListPdf } from "@hmcts/care-standards-tribunal-weekly-hearing-list";
import { type CauseListData, generateCauseListPdf } from "@hmcts/civil-and-family-daily-cause-list";
import { type CourtOfAppealCivilData, generateCourtOfAppealCivilDailyCauseListPdf } from "@hmcts/court-of-appeal-civil-daily-cause-list";
import { getListTypeName, type ListTypeName } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { generateLondonAdministrativeCourtDailyCauseListPdf, type LondonAdminCourtData } from "@hmcts/london-administrative-court-daily-cause-list";
import { sendPublicationNotifications } from "@hmcts/notifications";
import { generateRcjStandardDailyCauseListPdf, type StandardHearingList } from "@hmcts/rcj-standard-daily-cause-list";
import { mockListTypes } from "../index.js";

interface GeneratePdfParams {
  artefactId: string;
  listTypeId: number;
  contentDate: Date;
  locale: string;
  locationId: string;
  jsonData: unknown;
  provenance?: string;
  displayFrom?: Date;
  displayTo?: Date;
  logPrefix?: string;
}

interface GeneratePdfResult {
  pdfPath?: string;
  sizeBytes?: number;
  exceedsMaxSize?: boolean;
}

interface PdfResult {
  success: boolean;
  pdfPath?: string;
  sizeBytes?: number;
  exceedsMaxSize?: boolean;
  error?: string;
}

type PdfGenerator = (params: GeneratePdfParams) => Promise<PdfResult>;

const rcjStandardGenerator: PdfGenerator = (p) =>
  generateRcjStandardDailyCauseListPdf({ ...p, jsonData: p.jsonData as StandardHearingList, listTypeId: p.listTypeId });

const adminCourtGenerator: PdfGenerator = (p) =>
  generateAdministrativeCourtDailyCauseListPdf({ ...p, jsonData: p.jsonData as AdministrativeCourtHearingList, listTypeId: p.listTypeId });

const PDF_GENERATOR_REGISTRY: Partial<Record<ListTypeName, PdfGenerator>> = {
  CIVIL_AND_FAMILY_DAILY_CAUSE_LIST: (p) => generateCauseListPdf({ ...p, jsonData: p.jsonData as CauseListData }),
  CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST: (p) =>
    generateCareStandardsTribunalWeeklyHearingListPdf({
      ...p,
      jsonData: p.jsonData as CareStandardsTribunalHearingList,
      displayFrom: p.displayFrom!,
      displayTo: p.displayTo!
    }),
  CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST: rcjStandardGenerator,
  COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST: rcjStandardGenerator,
  COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST: rcjStandardGenerator,
  FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST: rcjStandardGenerator,
  KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST: rcjStandardGenerator,
  KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST: rcjStandardGenerator,
  MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST: rcjStandardGenerator,
  SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST: rcjStandardGenerator,
  LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: (p) =>
    generateLondonAdministrativeCourtDailyCauseListPdf({ ...p, jsonData: p.jsonData as LondonAdminCourtData }),
  COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST: (p) => generateCourtOfAppealCivilDailyCauseListPdf({ ...p, jsonData: p.jsonData as CourtOfAppealCivilData }),
  BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtGenerator,
  LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtGenerator,
  BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtGenerator,
  MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtGenerator
};

export async function generatePublicationPdf(params: GeneratePdfParams): Promise<GeneratePdfResult> {
  const { listTypeId, artefactId, logPrefix = "[Publication]" } = params;

  const listTypeName = getListTypeName(listTypeId);
  const generator = listTypeName ? PDF_GENERATOR_REGISTRY[listTypeName] : undefined;
  if (!generator) {
    return {};
  }

  try {
    const pdfResult = await generator(params);

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
  displayFrom?: Date;
  displayTo?: Date;
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
  const {
    artefactId,
    locationId,
    listTypeId,
    contentDate,
    locale,
    jsonData,
    provenance,
    displayFrom,
    displayTo,
    skipNotifications = false,
    logPrefix = "[Publication]"
  } = params;

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
      displayFrom,
      displayTo,
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
