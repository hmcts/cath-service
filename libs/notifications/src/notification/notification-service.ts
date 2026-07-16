import {
  extractCaseSummary as extractAdminCourtSummary,
  formatCaseSummaryForEmail as formatAdminCourtSummaryForEmail
} from "@hmcts/administrative-court-daily-cause-list";
import { extractCaseSummary as extractAstSummary, formatCaseSummaryForEmail as formatAstSummaryForEmail } from "@hmcts/ast-daily-hearing-list";
import { CONTAINER, downloadBlob } from "@hmcts/azure-blob";
import {
  extractCaseSummary as extractCareStandardsSummary,
  formatCaseSummaryForEmail as formatCareStandardsSummaryForEmail
} from "@hmcts/care-standards-tribunal-weekly-hearing-list";
import { extractCaseSummary as extractCicSummary, formatCaseSummaryForEmail as formatCicSummaryForEmail } from "@hmcts/cic-weekly-hearing-list";
import {
  extractCaseSummary as extractCivilFamilySummary,
  formatCaseSummaryForEmail as formatCivilFamilySummaryForEmail
} from "@hmcts/civil-and-family-daily-cause-list";
import { extractCaseSummary as extractCivilSummary, formatCaseSummaryForEmail as formatCivilSummaryForEmail } from "@hmcts/civil-daily-cause-list";
import {
  extractCaseSummary as extractCourtOfAppealSummary,
  formatCaseSummaryForEmail as formatCourtOfAppealSummaryForEmail
} from "@hmcts/court-of-appeal-civil-daily-cause-list";
import { extractCaseSummary as extractCrownDailySummary, formatCaseSummaryForEmail as formatCrownDailySummaryForEmail } from "@hmcts/crown-daily-list";
import { extractCaseSummary as extractCrownFirmSummary, formatCaseSummaryForEmail as formatCrownFirmSummaryForEmail } from "@hmcts/crown-firm-list";
import { extractCaseSummary as extractCrownWarnedSummary, formatCaseSummaryForEmail as formatCrownWarnedSummaryForEmail } from "@hmcts/crown-warned-list";
import { extractCaseSummary as extractFamilySummary, formatCaseSummaryForEmail as formatFamilySummaryForEmail } from "@hmcts/family-daily-cause-list";
import {
  extractCaseSummary as extractFttLrtSummary,
  formatCaseSummaryForEmail as formatFttLrtSummaryForEmail
} from "@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list";
import { extractCaseSummary as extractFttRptSummary, formatCaseSummaryForEmail as formatFttRptSummaryForEmail } from "@hmcts/ftt-rpt-weekly-hearing-list";
import {
  extractCaseSummary as extractFttTaxSummary,
  formatCaseSummaryForEmail as formatFttTaxSummaryForEmail
} from "@hmcts/ftt-tax-chamber-weekly-hearing-list";
import { extractCaseSummary as extractGrcSummary, formatCaseSummaryForEmail as formatGrcSummaryForEmail } from "@hmcts/grc-weekly-hearing-list";
import type { CaseSummary } from "@hmcts/list-types-common";
import {
  extractCaseSummary as extractLondonAdminSummary,
  formatCaseSummaryForEmail as formatLondonAdminSummaryForEmail
} from "@hmcts/london-administrative-court-daily-cause-list";
import {
  extractMagistratesAdultCourtListCaseSummary as extractMagistratesAdultCourtListSummary,
  formatMagistratesAdultCourtListCaseSummaryForEmail as formatMagistratesAdultCourtListSummaryForEmail
} from "@hmcts/magistrates-adult-court-list";
import {
  extractMagistratesPublicAdultCourtListCaseSummary as extractMagistratesPublicAdultCourtSummary,
  formatMagistratesPublicAdultCourtListCaseSummaryForEmail as formatMagistratesPublicAdultCourtSummaryForEmail
} from "@hmcts/magistrates-public-adult-court-list";
import {
  extractMagistratesPublicListCaseSummary as extractMagistratesPublicSummary,
  formatMagistratesPublicListCaseSummaryForEmail as formatMagistratesPublicSummaryForEmail
} from "@hmcts/magistrates-public-list";
import {
  extractCaseSummary as extractMagistratesStandardSummary,
  formatCaseSummaryForEmail as formatMagistratesStandardSummaryForEmail
} from "@hmcts/magistrates-standard-list";
import { prisma } from "@hmcts/postgres-prisma";
import { extractCaseSummary as extractRcjSummary, formatCaseSummaryForEmail as formatRcjSummaryForEmail } from "@hmcts/rcj-standard-daily-cause-list";
import { extractCaseSummary as extractSendSummary, formatCaseSummaryForEmail as formatSendSummaryForEmail } from "@hmcts/send-daily-hearing-list";
import {
  extractCaseSummary as extractSiacPoacPaacSummary,
  formatCaseSummaryForEmail as formatSiacPoacPaacSummaryForEmail
} from "@hmcts/siac-poac-paac-weekly-hearing-list";
import { extractCaseSummary as extractSscsSummary, formatCaseSummaryForEmail as formatSscsSummaryForEmail } from "@hmcts/sscs-daily-hearing-list";
import {
  extractCaseSummary as extractUtaacSummary,
  formatCaseSummaryForEmail as formatUtaacSummaryForEmail
} from "@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list";
import {
  extractCaseSummary as extractUtlcSummary,
  formatCaseSummaryForEmail as formatUtlcSummaryForEmail
} from "@hmcts/upper-tribunal-lands-chamber-daily-hearing-list";
import {
  extractCaseSummary as extractUtccSummary,
  formatCaseSummaryForEmail as formatUtccSummaryForEmail
} from "@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list";
import {
  extractCaseSummary as extractUtiacJrLeedsSummary,
  extractLondonCaseSummary as extractUtiacJrLondonSummary,
  formatCaseSummaryForEmail as formatUtiacJrLeedsSummaryForEmail
} from "@hmcts/utiac-jr-daily-hearing-list";
import {
  extractCaseSummary as extractUtiacSaSummary,
  formatCaseSummaryForEmail as formatUtiacSaSummaryForEmail
} from "@hmcts/utiac-statutory-appeal-daily-hearing-list";
import { extractCaseSummary as extractWpafccSummary, formatCaseSummaryForEmail as formatWpafccSummaryForEmail } from "@hmcts/wpafcc-weekly-hearing-list";
import { sendEmail } from "../govnotify/govnotify-client.js";
import {
  buildEnhancedTemplateParameters,
  buildTemplateParameters,
  getSubscriptionTemplateId,
  isSjpListType,
  type TemplateParameters
} from "../govnotify/template-config.js";
import { createNotificationAuditLog, updateNotificationStatus } from "./notification-queries.js";
import {
  type CaseSubscriberWithUser,
  findActiveSubscriptionsByCaseName,
  findActiveSubscriptionsByCaseNumber,
  findActiveSubscriptionsByLocation,
  findCaseSubscriptionsByUserIds,
  findListTypeSubscribersByListTypeAndLanguage,
  type ListTypeSubscriberWithUser,
  type SubscriptionWithUser
} from "./subscription-queries.js";
import { type PublicationEvent, validatePublicationEvent } from "./validation.js";

const MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024;

type SummaryExtractor = (jsonData: unknown) => CaseSummary[];
type SummaryFormatter = (items: CaseSummary[]) => string;

interface EmailBuilderConfig {
  extract: SummaryExtractor;
  format: SummaryFormatter;
}

const rcjStandardConfig: EmailBuilderConfig = { extract: extractRcjSummary as SummaryExtractor, format: formatRcjSummaryForEmail };
const adminCourtConfig: EmailBuilderConfig = { extract: extractAdminCourtSummary as SummaryExtractor, format: formatAdminCourtSummaryForEmail };
const sscsConfig: EmailBuilderConfig = { extract: extractSscsSummary as SummaryExtractor, format: formatSscsSummaryForEmail };

const EMAIL_BUILDER_REGISTRY: Partial<Record<string, EmailBuilderConfig>> = {
  CIVIL_AND_FAMILY_DAILY_CAUSE_LIST: {
    extract: extractCivilFamilySummary as SummaryExtractor,
    format: formatCivilFamilySummaryForEmail
  },
  CIVIL_DAILY_CAUSE_LIST: {
    extract: extractCivilSummary as SummaryExtractor,
    format: formatCivilSummaryForEmail
  },
  FAMILY_DAILY_CAUSE_LIST: {
    extract: extractFamilySummary as SummaryExtractor,
    format: formatFamilySummaryForEmail
  },
  CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST: {
    extract: extractCareStandardsSummary as SummaryExtractor,
    format: formatCareStandardsSummaryForEmail
  },
  SEND_DAILY_HEARING_LIST: {
    extract: extractSendSummary as SummaryExtractor,
    format: formatSendSummaryForEmail
  },
  CIC_WEEKLY_HEARING_LIST: {
    extract: extractCicSummary as SummaryExtractor,
    format: formatCicSummaryForEmail
  },
  AST_DAILY_HEARING_LIST: {
    extract: extractAstSummary as SummaryExtractor,
    format: formatAstSummaryForEmail
  },
  CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST: rcjStandardConfig,
  COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST: rcjStandardConfig,
  COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST: rcjStandardConfig,
  FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST: rcjStandardConfig,
  KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST: rcjStandardConfig,
  KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST: rcjStandardConfig,
  MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST: rcjStandardConfig,
  SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST: rcjStandardConfig,
  LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: {
    extract: extractLondonAdminSummary as SummaryExtractor,
    format: formatLondonAdminSummaryForEmail
  },
  COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST: {
    extract: extractCourtOfAppealSummary as SummaryExtractor,
    format: formatCourtOfAppealSummaryForEmail
  },
  CROWN_DAILY_LIST: {
    extract: extractCrownDailySummary as SummaryExtractor,
    format: formatCrownDailySummaryForEmail
  },
  CROWN_FIRM_LIST: {
    extract: extractCrownFirmSummary as SummaryExtractor,
    format: formatCrownFirmSummaryForEmail
  },
  CROWN_WARNED_LIST: {
    extract: extractCrownWarnedSummary as SummaryExtractor,
    format: formatCrownWarnedSummaryForEmail
  },
  BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtConfig,
  LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtConfig,
  BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtConfig,
  MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtConfig,
  SSCS_LONDON_DAILY_HEARING_LIST: sscsConfig,
  SSCS_MIDLANDS_DAILY_HEARING_LIST: sscsConfig,
  SSCS_SOUTH_EAST_DAILY_HEARING_LIST: sscsConfig,
  SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST: sscsConfig,
  SSCS_SCOTLAND_DAILY_HEARING_LIST: sscsConfig,
  SSCS_NORTH_EAST_DAILY_HEARING_LIST: sscsConfig,
  SSCS_NORTH_WEST_DAILY_HEARING_LIST: sscsConfig,
  SIAC_WEEKLY_HEARING_LIST: {
    extract: extractSiacPoacPaacSummary as SummaryExtractor,
    format: formatSiacPoacPaacSummaryForEmail
  },
  POAC_WEEKLY_HEARING_LIST: {
    extract: extractSiacPoacPaacSummary as SummaryExtractor,
    format: formatSiacPoacPaacSummaryForEmail
  },
  PAAC_WEEKLY_HEARING_LIST: {
    extract: extractSiacPoacPaacSummary as SummaryExtractor,
    format: formatSiacPoacPaacSummaryForEmail
  },
  FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST: {
    extract: extractFttTaxSummary as SummaryExtractor,
    format: formatFttTaxSummaryForEmail
  },
  FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST: {
    extract: extractFttLrtSummary as SummaryExtractor,
    format: formatFttLrtSummaryForEmail
  },
  FTT_RPT_EASTERN_WEEKLY_HEARING_LIST: {
    extract: extractFttRptSummary as SummaryExtractor,
    format: formatFttRptSummaryForEmail
  },
  FTT_RPT_LONDON_WEEKLY_HEARING_LIST: {
    extract: extractFttRptSummary as SummaryExtractor,
    format: formatFttRptSummaryForEmail
  },
  FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST: {
    extract: extractFttRptSummary as SummaryExtractor,
    format: formatFttRptSummaryForEmail
  },
  FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST: {
    extract: extractFttRptSummary as SummaryExtractor,
    format: formatFttRptSummaryForEmail
  },
  FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST: {
    extract: extractFttRptSummary as SummaryExtractor,
    format: formatFttRptSummaryForEmail
  },
  GRC_WEEKLY_HEARING_LIST: {
    extract: extractGrcSummary as SummaryExtractor,
    format: formatGrcSummaryForEmail
  },
  WPAFCC_WEEKLY_HEARING_LIST: {
    extract: extractWpafccSummary as SummaryExtractor,
    format: formatWpafccSummaryForEmail
  },
  UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST: {
    extract: extractUtiacSaSummary as SummaryExtractor,
    format: formatUtiacSaSummaryForEmail
  },
  UTIAC_JR_LONDON_DAILY_HEARING_LIST: {
    extract: extractUtiacJrLondonSummary as SummaryExtractor,
    format: formatUtiacJrLeedsSummaryForEmail
  },
  UTIAC_JR_LEEDS_DAILY_HEARING_LIST: {
    extract: extractUtiacJrLeedsSummary as SummaryExtractor,
    format: formatUtiacJrLeedsSummaryForEmail
  },
  UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST: {
    extract: extractUtiacJrLeedsSummary as SummaryExtractor,
    format: formatUtiacJrLeedsSummaryForEmail
  },
  UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST: {
    extract: extractUtiacJrLeedsSummary as SummaryExtractor,
    format: formatUtiacJrLeedsSummaryForEmail
  },
  UTIAC_JR_CARDIFF_DAILY_HEARING_LIST: {
    extract: extractUtiacJrLeedsSummary as SummaryExtractor,
    format: formatUtiacJrLeedsSummaryForEmail
  },
  UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST: {
    extract: extractUtccSummary as SummaryExtractor,
    format: formatUtccSummaryForEmail
  },
  UT_LANDS_CHAMBER_DAILY_HEARING_LIST: {
    extract: extractUtlcSummary as SummaryExtractor,
    format: formatUtlcSummaryForEmail
  },
  UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST: {
    extract: extractUtaacSummary as SummaryExtractor,
    format: formatUtaacSummaryForEmail
  },
  MAGISTRATES_STANDARD_LIST: {
    extract: extractMagistratesStandardSummary as SummaryExtractor,
    format: formatMagistratesStandardSummaryForEmail
  },
  MAGISTRATES_PUBLIC_LIST: {
    extract: extractMagistratesPublicSummary as SummaryExtractor,
    format: formatMagistratesPublicSummaryForEmail
  },
  MAGISTRATES_ADULT_COURT_LIST_DAILY: {
    extract: extractMagistratesAdultCourtListSummary as SummaryExtractor,
    format: formatMagistratesAdultCourtListSummaryForEmail
  },
  MAGISTRATES_ADULT_COURT_LIST_FUTURE: {
    extract: extractMagistratesAdultCourtListSummary as SummaryExtractor,
    format: formatMagistratesAdultCourtListSummaryForEmail
  },
  MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY: {
    extract: extractMagistratesPublicAdultCourtSummary as SummaryExtractor,
    format: formatMagistratesPublicAdultCourtSummaryForEmail
  },
  MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE: {
    extract: extractMagistratesPublicAdultCourtSummary as SummaryExtractor,
    format: formatMagistratesPublicAdultCourtSummaryForEmail
  }
};

export interface NotificationResult {
  totalSubscriptions: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
  notifiedUserIds: string[];
}

interface UserNotificationResult {
  status: "sent" | "failed" | "skipped";
  error?: string;
}

interface EmailTemplateData {
  templateParameters: TemplateParameters;
  templateId?: string;
  pdfBuffer?: Buffer;
  excelBuffer?: Buffer;
}

async function processUserNotification(
  subscription: SubscriptionWithUser,
  event: PublicationEvent,
  caseValue?: string,
  listTypeName?: string
): Promise<UserNotificationResult> {
  try {
    const validationResult = await validateUserEmail(subscription, event.publicationId);
    if (validationResult) {
      return validationResult;
    }

    const notification = await createNotificationAuditLog({
      subscriptionId: subscription.subscriptionId,
      userId: subscription.userId,
      publicationId: event.publicationId,
      status: "Pending"
    });

    const userName = buildUserName(subscription.user.firstName, subscription.user.surname);
    const emailData = await buildEmailTemplateData(event, userName, listTypeName, caseValue);

    const emailResult = await sendEmail({
      emailAddress: subscription.user.email!,
      templateParameters: emailData.templateParameters,
      templateId: emailData.templateId,
      pdfBuffer: emailData.pdfBuffer,
      excelBuffer: emailData.excelBuffer
    });

    if (emailResult.success) {
      await updateNotificationStatus(notification.notificationId, "Sent", new Date(), undefined, emailResult.notificationId);
      return { status: "sent" };
    }

    await updateNotificationStatus(notification.notificationId, "Failed", undefined, emailResult.error);
    return { status: "failed", error: `User ${subscription.userId}: ${emailResult.error}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { status: "failed", error: `User ${subscription.userId}: ${errorMessage}` };
  }
}

async function validateUserEmail(subscription: SubscriptionWithUser, publicationId: string): Promise<UserNotificationResult | null> {
  if (!subscription.user.email) {
    return skipNotification(subscription, publicationId, "No email address");
  }

  return null;
}

async function skipNotification(subscription: SubscriptionWithUser, publicationId: string, reason: string): Promise<UserNotificationResult> {
  const notification = await createNotificationAuditLog({
    subscriptionId: subscription.subscriptionId,
    userId: subscription.userId,
    publicationId,
    status: "Skipped"
  });

  await updateNotificationStatus(notification.notificationId, "Skipped", undefined, reason);

  return { status: "skipped", error: `User ${subscription.userId}: ${reason}` };
}

async function buildEmailTemplateData(event: PublicationEvent, userName: string, listTypeName?: string, caseValue?: string): Promise<EmailTemplateData> {
  const config = listTypeName ? EMAIL_BUILDER_REGISTRY[listTypeName] : undefined;

  if (config && event.jsonData) {
    return buildEnhancedEmailData(event, userName, config, listTypeName, caseValue);
  }

  return buildFallbackEmailData(event, userName, listTypeName, caseValue);
}

async function buildEnhancedEmailData(
  event: PublicationEvent,
  userName: string,
  config: EmailBuilderConfig,
  listTypeName?: string,
  caseValue?: string
): Promise<EmailTemplateData> {
  try {
    const caseSummaryItems = config.extract(event.jsonData);
    const caseSummary = config.format(caseSummaryItems);

    const templateParameters = buildEnhancedTemplateParameters({
      userName,
      hearingListName: event.hearingListName,
      publicationDate: event.publicationDate,
      locationName: event.locationName,
      caseSummary,
      caseValue
    });

    return await buildEmailDataWithFiles(event.publicationId, event.pdfFilePath, listTypeName, templateParameters);
  } catch (error) {
    console.error("Failed to build enhanced template parameters, falling back to standard template:", error);
    return buildFallbackEmailData(event, userName, listTypeName, caseValue);
  }
}

async function buildEmailDataWithFiles(
  artefactId: string,
  pdfBlobKey: string | undefined,
  listTypeName: string | undefined,
  templateParameters: TemplateParameters
): Promise<EmailTemplateData> {
  const isSjp = listTypeName ? isSjpListType(listTypeName) : false;

  const pdfBuffer = pdfBlobKey ? await downloadBlob(pdfBlobKey, CONTAINER.PUBLICATIONS) : null;
  const excelBuffer = await downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS);

  const hasPdf = !!pdfBuffer;
  const pdfUnder2MB = hasPdf && pdfBuffer.length < MAX_PDF_SIZE_BYTES;

  const hasExcel = !!excelBuffer;
  const excelUnder2MB = hasExcel && excelBuffer.length < MAX_PDF_SIZE_BYTES;

  const filesUnder2MB = (hasPdf ? pdfUnder2MB : true) && (hasExcel ? excelUnder2MB : true);

  const templateId = getSubscriptionTemplateId({
    isSjp,
    hasPdf: hasPdf && pdfUnder2MB,
    hasExcel: hasExcel && excelUnder2MB,
    filesUnder2MB
  });

  return {
    templateParameters,
    templateId,
    pdfBuffer: pdfUnder2MB ? pdfBuffer : undefined,
    excelBuffer: excelUnder2MB ? excelBuffer : undefined
  };
}

async function buildFallbackEmailData(event: PublicationEvent, userName: string, listTypeName?: string, caseValue?: string): Promise<EmailTemplateData> {
  const templateParameters = buildTemplateParameters({
    userName,
    hearingListName: event.hearingListName,
    publicationDate: event.publicationDate,
    locationName: event.locationName,
    caseValue
  });

  return await buildEmailDataWithFiles(event.publicationId, event.pdfFilePath, listTypeName, templateParameters);
}

function aggregateResults(results: PromiseSettledResult<UserNotificationResult>[], totalSubscriptions: number): NotificationResult {
  const result: NotificationResult = {
    totalSubscriptions,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    notifiedUserIds: []
  };

  for (const settledResult of results) {
    if (settledResult.status === "fulfilled") {
      const userResult = settledResult.value;
      result[userResult.status]++;
      if (userResult.error) {
        result.errors.push(userResult.error);
      }
    } else {
      result.failed++;
      result.errors.push(settledResult.reason?.message || "Unknown error");
    }
  }

  return result;
}

function buildUserName(firstName: string | null, surname: string | null): string {
  const parts = [firstName, surname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "User";
}

export interface ListTypePublicationEvent {
  publicationId: string;
  locationId: string;
  locationName: string;
  hearingListName: string;
  publicationDate: Date;
  listTypeId: number;
  language: string;
  jsonData?: unknown;
  pdfFilePath?: string;
}

export async function sendListTypePublicationNotifications(event: ListTypePublicationEvent, excludeUserIds?: string[]): Promise<NotificationResult> {
  const listTypeName = (await prisma.listType.findUnique({ where: { id: event.listTypeId }, select: { name: true } }).catch(() => null))?.name;

  const allSubscribers = await findListTypeSubscribersByListTypeAndLanguage(event.listTypeId, event.language);
  const excludeSet = new Set(excludeUserIds ?? []);
  const subscribers = excludeSet.size > 0 ? allSubscribers.filter((s) => !excludeSet.has(s.userId)) : allSubscribers;

  if (subscribers.length === 0) {
    return { totalSubscriptions: 0, sent: 0, failed: 0, skipped: 0, errors: [], notifiedUserIds: [] };
  }

  const caseValueByUserId = await buildCaseValueMapFromSubscriptions(subscribers.map((s) => s.userId));

  const results = await Promise.allSettled(
    subscribers.map((subscriber) => processListTypeUserNotification(subscriber, event, listTypeName, caseValueByUserId.get(subscriber.userId)))
  );

  return aggregateResults(results, subscribers.length);
}

async function buildCaseValueMapFromSubscriptions(userIds: string[]): Promise<Map<string, string>> {
  const subscriptions = await findCaseSubscriptionsByUserIds(userIds);
  const map = new Map<string, string>();
  for (const sub of subscriptions) {
    if (!map.has(sub.userId)) {
      map.set(sub.userId, sub.searchValue);
    }
  }
  return map;
}

async function processListTypeUserNotification(
  subscriber: ListTypeSubscriberWithUser,
  event: ListTypePublicationEvent,
  listTypeName?: string,
  caseValue?: string
): Promise<UserNotificationResult> {
  if (!subscriber.user.email) {
    return { status: "skipped", error: `User ${subscriber.userId}: No email address` };
  }

  try {
    const userName = buildUserName(subscriber.user.firstName, subscriber.user.surname);
    const publicationEvent: PublicationEvent = {
      publicationId: event.publicationId,
      locationId: event.locationId,
      locationName: event.locationName,
      hearingListName: event.hearingListName,
      publicationDate: event.publicationDate,
      listTypeId: event.listTypeId,
      jsonData: event.jsonData,
      pdfFilePath: event.pdfFilePath
    };
    const emailData = await buildEmailTemplateData(publicationEvent, userName, listTypeName, caseValue);

    const emailResult = await sendEmail({
      emailAddress: subscriber.user.email,
      templateParameters: emailData.templateParameters,
      templateId: emailData.templateId,
      pdfBuffer: emailData.pdfBuffer,
      excelBuffer: emailData.excelBuffer
    });

    if (emailResult.success) {
      return { status: "sent" };
    }

    return { status: "failed", error: `User ${subscriber.userId}: ${emailResult.error}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { status: "failed", error: `User ${subscriber.userId}: ${errorMessage}` };
  }
}

interface CombinedSubscriberEntry {
  subscriber: SubscriptionWithUser | CaseSubscriberWithUser;
  caseValue?: string;
}

function formatCaseValue(caseNumber: string | null, caseName: string | null): string {
  if (caseNumber && caseName) return `${caseNumber} (${caseName})`;
  return caseNumber ?? caseName ?? "";
}

export async function sendLocationAndCaseSubscriptionNotifications(artefactId: string, event: PublicationEvent): Promise<NotificationResult> {
  const validation = validatePublicationEvent(event);
  if (!validation.valid) {
    throw new Error(`Invalid publication event: ${validation.errors.join(", ")}`);
  }

  const locationIdNum = Number.parseInt(event.locationId, 10);
  if (Number.isNaN(locationIdNum)) {
    throw new Error(`Invalid location ID: ${event.locationId}`);
  }

  const listTypeName = event.listTypeId
    ? (await prisma.listType.findUnique({ where: { id: event.listTypeId }, select: { name: true } }).catch(() => null))?.name
    : undefined;

  const subscriberMap = new Map<string, CombinedSubscriberEntry>();

  // Add location subscribers first
  const locationSubs = await findActiveSubscriptionsByLocation(locationIdNum);
  for (const sub of locationSubs) {
    subscriberMap.set(sub.userId, { subscriber: sub });
  }

  // Enrich location subscribers with their case subscription values
  if (locationSubs.length > 0) {
    const locationCaseValues = await buildCaseValueMapFromSubscriptions(locationSubs.map((s) => s.userId));
    for (const [userId, entry] of subscriberMap) {
      entry.caseValue ??= locationCaseValues.get(userId);
    }
  }

  // Merge in case-only subscribers via artefact search
  const artefactSearches = await prisma.artefactSearch.findMany({
    where: { artefactId },
    select: { caseNumber: true, caseName: true }
  });

  for (const search of artefactSearches) {
    if (search.caseNumber) {
      const subs = await findActiveSubscriptionsByCaseNumber(search.caseNumber);
      const caseValue = formatCaseValue(search.caseNumber, search.caseName);
      for (const sub of subs) {
        const existing = subscriberMap.get(sub.userId);
        if (existing) {
          existing.caseValue ??= caseValue;
        } else {
          subscriberMap.set(sub.userId, { subscriber: sub, caseValue });
        }
      }
    }

    if (search.caseName) {
      const subs = await findActiveSubscriptionsByCaseName(search.caseName);
      const caseValue = formatCaseValue(search.caseNumber, search.caseName);
      for (const sub of subs) {
        const existing = subscriberMap.get(sub.userId);
        if (existing) {
          existing.caseValue ??= caseValue;
        } else {
          subscriberMap.set(sub.userId, { subscriber: sub, caseValue });
        }
      }
    }
  }

  if (subscriberMap.size === 0) {
    return { totalSubscriptions: 0, sent: 0, failed: 0, skipped: 0, errors: [], notifiedUserIds: [] };
  }

  const notifiedUserIds = Array.from(subscriberMap.keys());

  const results = await Promise.allSettled(
    Array.from(subscriberMap.values()).map(({ subscriber, caseValue }) =>
      processUserNotification(subscriber as unknown as SubscriptionWithUser, event, caseValue, listTypeName)
    )
  );

  return { ...aggregateResults(results, subscriberMap.size), notifiedUserIds };
}
