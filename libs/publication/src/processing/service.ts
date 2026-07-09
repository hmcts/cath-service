import { type AdministrativeCourtHearingList, generateAdministrativeCourtDailyCauseListPdf } from "@hmcts/administrative-court-daily-cause-list";
import { type AstDailyHearingList, generateAstDailyHearingListPdf } from "@hmcts/ast-daily-hearing-list";
import { type CareStandardsTribunalHearingList, generateCareStandardsTribunalWeeklyHearingListPdf } from "@hmcts/care-standards-tribunal-weekly-hearing-list";
import { type CicWeeklyHearingList, generateCicWeeklyHearingListPdf } from "@hmcts/cic-weekly-hearing-list";
import { type CauseListData, generateCauseListPdf } from "@hmcts/civil-and-family-daily-cause-list";
import { type CauseListData as CivilCauseListData, generateCivilDailyCauseListPdf } from "@hmcts/civil-daily-cause-list";
import { type CourtOfAppealCivilData, generateCourtOfAppealCivilDailyCauseListPdf } from "@hmcts/court-of-appeal-civil-daily-cause-list";
import { type CrownDailyListData, generateCrownDailyListPdf } from "@hmcts/crown-daily-list";
import { type CrownFirmListData, generateCrownFirmListPdf } from "@hmcts/crown-firm-list";
import { type CrownWarnedListData, generateCrownWarnedListPdf } from "@hmcts/crown-warned-list";
import { type CauseListData as FamilyCauseListData, generateFamilyDailyCauseListPdf } from "@hmcts/family-daily-cause-list";
import { type FttLrtHearingList, generateFttLrtWeeklyHearingListPdf } from "@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list";
import { type FttRptHearingList, generateFttRptWeeklyHearingListPdf } from "@hmcts/ftt-rpt-weekly-hearing-list";
import { type FttTaxChamberHearingList, generateFttTaxChamberWeeklyHearingListPdf } from "@hmcts/ftt-tax-chamber-weekly-hearing-list";
import { type GrcWeeklyHearingList, generateGrcWeeklyHearingListPdf } from "@hmcts/grc-weekly-hearing-list";
import { sendThirdPartyPublications } from "@hmcts/legacy-third-party-fulfilment";
import { getLocationById } from "@hmcts/location";
import { generateLondonAdministrativeCourtDailyCauseListPdf, type LondonAdminCourtData } from "@hmcts/london-administrative-court-daily-cause-list";
import { generateMagistratesPublicAdultCourtListPdf, type MagistratesPublicAdultCourtListData } from "@hmcts/magistrates-public-adult-court-list";
import { generateMagistratesPublicListPdf, type MagistratesPublicListData } from "@hmcts/magistrates-public-list";
import { generateMagistratesStandardListPdf, type MagistratesStandardList } from "@hmcts/magistrates-standard-list";
import { sendListTypePublicationNotifications, sendLocationAndCaseSubscriptionNotifications } from "@hmcts/notifications";
import { prisma } from "@hmcts/postgres-prisma";
import { generateRcjStandardDailyCauseListPdf, type StandardHearingList } from "@hmcts/rcj-standard-daily-cause-list";
import { generateSendDailyHearingListPdf, type SendDailyHearingList } from "@hmcts/send-daily-hearing-list";
import { generateSiacPoacPaacWeeklyHearingListPdf, type SiacPoacPaacHearingList } from "@hmcts/siac-poac-paac-weekly-hearing-list";
import { generateSscsDailyHearingListPdf, importantInformationByListType, type SscsDailyHearingList } from "@hmcts/sscs-daily-hearing-list";
import { generateUtaacDailyHearingListPdf, type UtaacHearingList } from "@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list";
import { generateUtlcDailyHearingListPdf, type UtlcHearingList } from "@hmcts/upper-tribunal-lands-chamber-daily-hearing-list";
import { generateUtccDailyHearingListPdf, type UtccHearingList } from "@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list";
import {
  createUtiacJrDailyHearingListPdfGenerator,
  generateUtiacJrLeedsDailyHearingListPdf,
  generateUtiacJrLondonDailyHearingListPdf,
  type UtiacJrHearingList,
  type UtiacJrLeedsHearingList,
  type UtiacJrLondonHearingList
} from "@hmcts/utiac-jr-daily-hearing-list";
import { generateUtiacStatutoryAppealDailyHearingListPdf, type UtiacStatutoryAppealHearingList } from "@hmcts/utiac-statutory-appeal-daily-hearing-list";
import { generateWpafccWeeklyHearingListPdf, type WpafccWeeklyHearingList } from "@hmcts/wpafcc-weekly-hearing-list";
import { extractAndStoreArtefactSearch } from "../artefact-search-extractor.js";

const LOCALE_TO_LANGUAGE: Record<string, string> = {
  en: "ENGLISH",
  cy: "WELSH"
};

interface GeneratePdfParams {
  artefactId: string;
  listTypeId: number;
  listTypeName?: string;
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
  generateRcjStandardDailyCauseListPdf({ ...p, jsonData: p.jsonData as StandardHearingList, listTypeName: p.listTypeName ?? "" });

const adminCourtGenerator: PdfGenerator = (p) =>
  generateAdministrativeCourtDailyCauseListPdf({ ...p, jsonData: p.jsonData as AdministrativeCourtHearingList, listTypeName: p.listTypeName ?? "" });

const SSCS_FRIENDLY_NAMES: Record<string, { en: string; cy: string }> = {
  SSCS_MIDLANDS_DAILY_HEARING_LIST: {
    en: "Midlands Social Security and Child Support Tribunal Daily Hearing List",
    cy: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Canolbarth Lloegr"
  },
  SSCS_SOUTH_EAST_DAILY_HEARING_LIST: {
    en: "South East Social Security and Child Support Tribunal Daily Hearing List",
    cy: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant De Ddwyrain"
  },
  SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST: {
    en: "Wales and South West Social Security and Child Support Tribunal Daily Hearing List",
    cy: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Cymru a De Orllewin Lloegr"
  },
  SSCS_SCOTLAND_DAILY_HEARING_LIST: {
    en: "Scotland Social Security and Child Support Tribunal Daily Hearing List",
    cy: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Yr Alban"
  },
  SSCS_NORTH_EAST_DAILY_HEARING_LIST: {
    en: "North East Social Security and Child Support Tribunal Daily Hearing List",
    cy: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Gogledd Ddwyrain Lloegr"
  },
  SSCS_NORTH_WEST_DAILY_HEARING_LIST: {
    en: "North West Social Security and Child Support Tribunal Daily Hearing List",
    cy: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Gogledd Orllewin Lloegr"
  },
  SSCS_LONDON_DAILY_HEARING_LIST: {
    en: "London Social Security and Child Support Tribunal Daily Hearing List",
    cy: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Llundain"
  }
};

const sscsGeneratorForListType =
  (listTypeName: string): PdfGenerator =>
  (p) => {
    const names = SSCS_FRIENDLY_NAMES[listTypeName];
    const friendlyName = names ? (p.locale === "cy" ? names.cy : names.en) : listTypeName;
    return generateSscsDailyHearingListPdf({
      ...p,
      jsonData: p.jsonData as SscsDailyHearingList,
      listTitle: friendlyName,
      courtName: friendlyName,
      importantInformationText: importantInformationByListType[listTypeName] ?? ""
    });
  };

const PDF_GENERATOR_REGISTRY: Partial<Record<string, PdfGenerator>> = {
  CIVIL_DAILY_CAUSE_LIST: (p) => generateCivilDailyCauseListPdf({ ...p, jsonData: p.jsonData as CivilCauseListData }),
  CIVIL_AND_FAMILY_DAILY_CAUSE_LIST: (p) => generateCauseListPdf({ ...p, jsonData: p.jsonData as CauseListData }),
  FAMILY_DAILY_CAUSE_LIST: (p) => generateFamilyDailyCauseListPdf({ ...p, jsonData: p.jsonData as FamilyCauseListData }),
  CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST: (p) =>
    generateCareStandardsTribunalWeeklyHearingListPdf({
      ...p,
      jsonData: p.jsonData as CareStandardsTribunalHearingList
    }),
  SEND_DAILY_HEARING_LIST: (p) =>
    generateSendDailyHearingListPdf({
      ...p,
      jsonData: p.jsonData as SendDailyHearingList
    }),
  CIC_WEEKLY_HEARING_LIST: (p) =>
    generateCicWeeklyHearingListPdf({
      ...p,
      contentDate: p.contentDate,
      jsonData: p.jsonData as CicWeeklyHearingList
    }),
  AST_DAILY_HEARING_LIST: (p) =>
    generateAstDailyHearingListPdf({
      ...p,
      contentDate: p.contentDate,
      jsonData: p.jsonData as AstDailyHearingList
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
  CROWN_DAILY_LIST: (p) => generateCrownDailyListPdf({ ...p, jsonData: p.jsonData as CrownDailyListData }),
  CROWN_FIRM_LIST: (p) => generateCrownFirmListPdf({ ...p, jsonData: p.jsonData as CrownFirmListData }),
  CROWN_WARNED_LIST: (p) => generateCrownWarnedListPdf({ ...p, jsonData: p.jsonData as CrownWarnedListData }),
  SSCS_MIDLANDS_DAILY_HEARING_LIST: sscsGeneratorForListType("SSCS_MIDLANDS_DAILY_HEARING_LIST"),
  SSCS_SOUTH_EAST_DAILY_HEARING_LIST: sscsGeneratorForListType("SSCS_SOUTH_EAST_DAILY_HEARING_LIST"),
  SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST: sscsGeneratorForListType("SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST"),
  SSCS_SCOTLAND_DAILY_HEARING_LIST: sscsGeneratorForListType("SSCS_SCOTLAND_DAILY_HEARING_LIST"),
  SSCS_NORTH_EAST_DAILY_HEARING_LIST: sscsGeneratorForListType("SSCS_NORTH_EAST_DAILY_HEARING_LIST"),
  SSCS_NORTH_WEST_DAILY_HEARING_LIST: sscsGeneratorForListType("SSCS_NORTH_WEST_DAILY_HEARING_LIST"),
  SSCS_LONDON_DAILY_HEARING_LIST: sscsGeneratorForListType("SSCS_LONDON_DAILY_HEARING_LIST"),
  SIAC_WEEKLY_HEARING_LIST: (p) =>
    generateSiacPoacPaacWeeklyHearingListPdf({
      ...p,
      jsonData: p.jsonData as SiacPoacPaacHearingList,
      courtName: "Special Immigration Appeals Commission",
      listTitle: "Special Immigration Appeals Commission Weekly Hearing List"
    }),
  POAC_WEEKLY_HEARING_LIST: (p) =>
    generateSiacPoacPaacWeeklyHearingListPdf({
      ...p,
      jsonData: p.jsonData as SiacPoacPaacHearingList,
      courtName: "Proscribed Organisations Appeal Commission",
      listTitle: "Proscribed Organisations Appeal Commission Weekly Hearing List"
    }),
  PAAC_WEEKLY_HEARING_LIST: (p) =>
    generateSiacPoacPaacWeeklyHearingListPdf({
      ...p,
      jsonData: p.jsonData as SiacPoacPaacHearingList,
      courtName: "Pathogens Access Appeal Commission",
      listTitle: "Pathogens Access Appeal Commission Weekly Hearing List"
    }),
  FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST: (p) => generateFttTaxChamberWeeklyHearingListPdf({ ...p, jsonData: p.jsonData as FttTaxChamberHearingList }),
  FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST: (p) => generateFttLrtWeeklyHearingListPdf({ ...p, jsonData: p.jsonData as FttLrtHearingList }),
  FTT_RPT_EASTERN_WEEKLY_HEARING_LIST: (p) =>
    generateFttRptWeeklyHearingListPdf({
      ...p,
      jsonData: p.jsonData as FttRptHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal)",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List"
    }),
  FTT_RPT_LONDON_WEEKLY_HEARING_LIST: (p) =>
    generateFttRptWeeklyHearingListPdf({
      ...p,
      jsonData: p.jsonData as FttRptHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal)",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): London region Weekly Hearing List"
    }),
  FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST: (p) =>
    generateFttRptWeeklyHearingListPdf({
      ...p,
      jsonData: p.jsonData as FttRptHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal)",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Midlands region Weekly Hearing List"
    }),
  FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST: (p) =>
    generateFttRptWeeklyHearingListPdf({
      ...p,
      jsonData: p.jsonData as FttRptHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal)",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Northern region Weekly Hearing List"
    }),
  FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST: (p) =>
    generateFttRptWeeklyHearingListPdf({
      ...p,
      jsonData: p.jsonData as FttRptHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal)",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Southern region Weekly Hearing List"
    }),
  GRC_WEEKLY_HEARING_LIST: (p) => generateGrcWeeklyHearingListPdf({ ...p, jsonData: p.jsonData as GrcWeeklyHearingList }),
  WPAFCC_WEEKLY_HEARING_LIST: (p) => generateWpafccWeeklyHearingListPdf({ ...p, jsonData: p.jsonData as WpafccWeeklyHearingList }),
  UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST: (p) =>
    generateUtiacStatutoryAppealDailyHearingListPdf({
      ...p,
      jsonData: p.jsonData as UtiacStatutoryAppealHearingList,
      contentDate: p.contentDate
    }),
  UTIAC_JR_LONDON_DAILY_HEARING_LIST: (p) =>
    generateUtiacJrLondonDailyHearingListPdf({
      ...p,
      jsonData: p.jsonData as UtiacJrLondonHearingList,
      contentDate: p.contentDate
    }),
  UTIAC_JR_LEEDS_DAILY_HEARING_LIST: (p) =>
    generateUtiacJrLeedsDailyHearingListPdf({
      ...p,
      jsonData: p.jsonData as UtiacJrLeedsHearingList,
      contentDate: p.contentDate
    }),
  UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST: (p) =>
    createUtiacJrDailyHearingListPdfGenerator("Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List")({
      ...p,
      jsonData: p.jsonData as UtiacJrHearingList,
      contentDate: p.contentDate
    }),
  UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST: (p) =>
    createUtiacJrDailyHearingListPdfGenerator("Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Birmingham Daily Hearing List")({
      ...p,
      jsonData: p.jsonData as UtiacJrHearingList,
      contentDate: p.contentDate
    }),
  UTIAC_JR_CARDIFF_DAILY_HEARING_LIST: (p) =>
    createUtiacJrDailyHearingListPdfGenerator("Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Cardiff Daily Hearing List")({
      ...p,
      jsonData: p.jsonData as UtiacJrHearingList,
      contentDate: p.contentDate
    }),
  UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST: (p) => generateUtccDailyHearingListPdf({ ...p, jsonData: p.jsonData as UtccHearingList }),
  UT_LANDS_CHAMBER_DAILY_HEARING_LIST: (p) => generateUtlcDailyHearingListPdf({ ...p, jsonData: p.jsonData as UtlcHearingList }),
  UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST: (p) => generateUtaacDailyHearingListPdf({ ...p, jsonData: p.jsonData as UtaacHearingList }),
  MAGISTRATES_STANDARD_LIST: (p) => generateMagistratesStandardListPdf({ ...p, jsonData: p.jsonData as MagistratesStandardList }),
  MAGISTRATES_PUBLIC_LIST: (p) => generateMagistratesPublicListPdf({ ...p, jsonData: p.jsonData as MagistratesPublicListData }),
  MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY: (p) =>
    generateMagistratesPublicAdultCourtListPdf({
      ...p,
      jsonData: p.jsonData as MagistratesPublicAdultCourtListData,
      listTitle: "Magistrates Public Adult Court List - Daily"
    }),
  MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE: (p) =>
    generateMagistratesPublicAdultCourtListPdf({
      ...p,
      jsonData: p.jsonData as MagistratesPublicAdultCourtListData,
      listTitle: "Magistrates Public Adult Court List - Future"
    })
};

export async function generatePublicationPdf(params: GeneratePdfParams): Promise<GeneratePdfResult> {
  const { listTypeId, artefactId, logPrefix = "[Publication]" } = params;

  try {
    const listType = await prisma.listType.findUnique({ where: { id: listTypeId }, select: { name: true } });
    const listTypeName = listType?.name ?? "";
    const generator = listTypeName ? PDF_GENERATOR_REGISTRY[listTypeName] : undefined;
    if (!generator) {
      return {};
    }

    const pdfResult = await generator({ ...params, listTypeName });

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
