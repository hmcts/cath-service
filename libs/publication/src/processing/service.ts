import { type AdministrativeCourtHearingList, generateAdministrativeCourtDailyCauseListPdf } from "@hmcts/administrative-court-daily-cause-list";
import { type CareStandardsTribunalHearingList, generateCareStandardsTribunalWeeklyHearingListPdf } from "@hmcts/care-standards-tribunal-weekly-hearing-list";
import { type CauseListData, generateCauseListPdf } from "@hmcts/civil-and-family-daily-cause-list";
import { type CourtOfAppealCivilData, generateCourtOfAppealCivilDailyCauseListPdf } from "@hmcts/court-of-appeal-civil-daily-cause-list";
import { generateSjpPressListExcel, generateSjpPublicListExcel, saveExcelFile } from "@hmcts/excel-generation";
import { sendThirdPartyPublications } from "@hmcts/legacy-third-party-fulfilment";
import type { SjpJson } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { generateLondonAdministrativeCourtDailyCauseListPdf, type LondonAdminCourtData } from "@hmcts/london-administrative-court-daily-cause-list";
import { sendListTypePublicationNotifications, sendLocationAndCaseSubscriptionNotifications } from "@hmcts/notifications";
import { prisma } from "@hmcts/postgres-prisma";
import { generateRcjStandardDailyCauseListPdf, type StandardHearingList } from "@hmcts/rcj-standard-daily-cause-list";
import { generateSjpPressListPdf } from "@hmcts/sjp-press-list";
import { generateSjpPublicListPdf } from "@hmcts/sjp-public-list";
import { extractAndStoreArtefactSearch } from "../artefact-search-extractor.js";

const LOCALE_TO_LANGUAGE: Record<string, string> = {
  en: "ENGLISH",
  cy: "WELSH"
};

interface GeneratePdfParams {
  artefactId: string;
  listTypeId: number;
  listTypeName: string;
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

const sjpPublicGenerator: PdfGenerator = (p) => generateSjpPublicListPdf({ ...p, jsonData: p.jsonData as SjpJson });

const sjpPressGenerator: PdfGenerator = (p) => generateSjpPressListPdf({ ...p, jsonData: p.jsonData as SjpJson });

const PDF_GENERATOR_REGISTRY: Partial<Record<string, PdfGenerator>> = {
  CIVIL_AND_FAMILY_DAILY_CAUSE_LIST: (p) => generateCauseListPdf({ ...p, jsonData: p.jsonData as CauseListData }),
  CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST: (p) =>
    generateCareStandardsTribunalWeeklyHearingListPdf({
      ...p,
      jsonData: p.jsonData as CareStandardsTribunalHearingList
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
  MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtGenerator,
  SJP_PUBLIC_LIST: sjpPublicGenerator,
  SJP_DELTA_PUBLIC_LIST: sjpPublicGenerator,
  SJP_PRESS_LIST: sjpPressGenerator,
  SJP_DELTA_PRESS_LIST: sjpPressGenerator
};

type ExcelGenerator = (json: SjpJson) => Promise<Buffer>;

const EXCEL_GENERATOR_REGISTRY: Partial<Record<string, ExcelGenerator>> = {
  SJP_PUBLIC_LIST: generateSjpPublicListExcel,
  SJP_DELTA_PUBLIC_LIST: generateSjpPublicListExcel,
  SJP_PRESS_LIST: generateSjpPressListExcel,
  SJP_DELTA_PRESS_LIST: generateSjpPressListExcel
};

export async function generatePublicationExcel(artefactId: string, listTypeId: number, jsonData: unknown, logPrefix = "[Publication]"): Promise<void> {
  try {
    const listType = await prisma.listType.findUnique({ where: { id: listTypeId }, select: { name: true } });
    const generator = listType ? EXCEL_GENERATOR_REGISTRY[listType.name] : undefined;
    if (!generator) {
      return;
    }

    const buffer = await generator(jsonData as SjpJson);
    await saveExcelFile(artefactId, buffer);
  } catch (error) {
    console.error(`${logPrefix} Excel generation error:`, { artefactId, error: error instanceof Error ? error.message : String(error) });
  }
}

export async function generatePublicationPdf(params: Omit<GeneratePdfParams, "listTypeName">): Promise<GeneratePdfResult> {
  const { listTypeId, artefactId, logPrefix = "[Publication]" } = params;

  try {
    const listType = await prisma.listType.findUnique({ where: { id: listTypeId }, select: { name: true } });
    const generator = listType ? PDF_GENERATOR_REGISTRY[listType.name] : undefined;
    if (!generator || !listType) {
      return {};
    }

    const pdfResult = await generator({ ...params, listTypeName: listType.name });

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
  locale?: string;
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
  const { artefactId, locationId, listTypeId, contentDate, jsonData, pdfFilePath, locale, logPrefix = "[Publication]" } = params;

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

    let listTypeFriendlyName = `LIST_TYPE_${listTypeId}`;
    try {
      const listType = await prisma.listType.findUnique({ where: { id: listTypeId }, select: { friendlyName: true } });
      if (listType?.friendlyName) {
        listTypeFriendlyName = listType.friendlyName;
      }
    } catch (error) {
      console.warn(`${logPrefix} List type lookup failed, using fallback name:`, {
        listTypeId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    const result = await sendLocationAndCaseSubscriptionNotifications(artefactId, {
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

    if (locale) {
      const language = LOCALE_TO_LANGUAGE[locale] ?? "ENGLISH";
      try {
        const listTypeResult = await sendListTypePublicationNotifications(
          {
            publicationId: artefactId,
            locationId,
            locationName: location.name,
            hearingListName: listTypeFriendlyName,
            publicationDate: contentDate,
            listTypeId,
            language,
            jsonData,
            pdfFilePath
          },
          result.notifiedUserIds
        );

        if (listTypeResult.errors.length > 0) {
          const sanitizedErrors = listTypeResult.errors.map((error) => {
            const errorStr = typeof error === "string" ? error : JSON.stringify(error);
            return errorStr.replace(/\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]");
          });
          console.error(`${logPrefix} List type notification errors:`, { count: listTypeResult.errors.length, errors: sanitizedErrors });
        }
      } catch (error) {
        console.error(`${logPrefix} Failed to send list type notifications:`, { artefactId, error: error instanceof Error ? error.message : String(error) });
      }
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
  sensitivity?: string;
  language?: string;
  isUpdate?: boolean;
  flatFilePath?: string;
  skipNotifications?: boolean;
  skipThirdPartyPush?: boolean;
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
    sensitivity = "",
    language = "",
    isUpdate = false,
    flatFilePath,
    skipNotifications = false,
    skipThirdPartyPush = false,
    logPrefix = "[Publication]"
  } = params;

  const result: ProcessPublicationResult = {};

  if (jsonData) {
    try {
      await extractAndStoreArtefactSearch(artefactId, listTypeId, jsonData);
    } catch (error) {
      console.error(`${logPrefix} Failed to extract artefact search data:`, {
        artefactId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

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

    await generatePublicationExcel(artefactId, listTypeId, jsonData, logPrefix);
  }

  if (!skipNotifications) {
    const notificationResult = await sendPublicationNotificationsForArtefact({
      artefactId,
      locationId,
      listTypeId,
      contentDate,
      jsonData,
      pdfFilePath: result.pdfPath,
      locale,
      logPrefix
    });

    result.notificationsSent = notificationResult.sent;
    result.notificationsFailed = notificationResult.failed;
  }

  if (!skipThirdPartyPush) {
    sendThirdPartyPublications({
      artefactId,
      locationId,
      listTypeId,
      contentDate,
      sensitivity,
      language,
      displayFrom: displayFrom ?? new Date(),
      displayTo: displayTo ?? new Date(),
      provenance: provenance ?? "",
      isUpdate,
      jsonData,
      pdfPath: result.pdfPath,
      flatFilePath,
      logPrefix
    }).catch((error) => {
      console.error(`${logPrefix} Third-party push failed:`, error);
    });
  }

  return result;
}
