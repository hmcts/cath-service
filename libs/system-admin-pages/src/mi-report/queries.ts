import type { MiReportSheet } from "@hmcts/excel-generation";
import { prisma } from "@hmcts/postgres-prisma";
import { buildCourtNameResolver, type CourtNameResolver } from "./court-name-resolver.js";

export const DEFAULT_SUBSCRIPTION_CHANNEL = "EMAIL";

const USER_ACCOUNTS_HEADERS = ["user_id", "provenance_user_id", "user_provenance", "roles", "created_date", "last_signed_in_date"];

const PUBLICATIONS_HEADERS = [
  "artefact_id",
  "display_from",
  "display_to",
  "language",
  "provenance",
  "sensitivity",
  "source_artefact_id",
  "superseded_count",
  "type",
  "content_date",
  "court_id",
  "court_name",
  "list_type"
];

const LOCATION_SUBSCRIPTIONS_HEADERS = ["id", "search_value", "channel", "user_id", "court_name", "created_date"];

const ALL_SUBSCRIPTIONS_HEADERS = ["id", "channel", "search_type", "user_id", "court_name", "created_date"];

const LOCATION_SEARCH_TYPE = "LOCATION_ID";

export async function buildUserAccountsSheet(cutoff?: Date): Promise<MiReportSheet> {
  const users = await prisma.user.findMany({
    where: cutoff ? { createdDate: { gte: cutoff } } : undefined,
    select: {
      userId: true,
      userProvenanceId: true,
      userProvenance: true,
      role: true,
      createdDate: true,
      lastSignedInDate: true
    }
  });

  const rows = users.map((user) => ({
    user_id: user.userId,
    provenance_user_id: user.userProvenanceId,
    user_provenance: user.userProvenance,
    roles: user.role,
    created_date: formatDate(user.createdDate),
    last_signed_in_date: formatDate(user.lastSignedInDate)
  }));

  return { name: "User Accounts", headers: USER_ACCOUNTS_HEADERS, rows };
}

export async function buildPublicationsSheet(cutoff?: Date, resolver?: CourtNameResolver): Promise<MiReportSheet> {
  const resolveCourtName = resolver ?? (await buildCourtNameResolver());

  const artefacts = await prisma.artefact.findMany({
    where: cutoff ? { lastReceivedDate: { gte: cutoff } } : undefined,
    select: {
      artefactId: true,
      displayFrom: true,
      displayTo: true,
      language: true,
      provenance: true,
      sensitivity: true,
      sourceArtefactId: true,
      supersededCount: true,
      type: true,
      contentDate: true,
      locationId: true,
      listType: { select: { name: true } }
    }
  });

  const rows = artefacts.map((artefact) => ({
    artefact_id: artefact.artefactId,
    display_from: formatDate(artefact.displayFrom),
    display_to: formatDate(artefact.displayTo),
    language: artefact.language,
    provenance: artefact.provenance,
    sensitivity: artefact.sensitivity,
    source_artefact_id: artefact.sourceArtefactId ?? "",
    superseded_count: artefact.supersededCount,
    type: artefact.type,
    content_date: formatDate(artefact.contentDate),
    court_id: artefact.locationId,
    court_name: resolveCourtName(artefact.locationId),
    list_type: artefact.listType.name
  }));

  return { name: "Publications", headers: PUBLICATIONS_HEADERS, rows };
}

export async function buildLocationSubscriptionsSheet(cutoff?: Date, resolver?: CourtNameResolver): Promise<MiReportSheet> {
  const resolveCourtName = resolver ?? (await buildCourtNameResolver());

  const subscriptions = await prisma.subscription.findMany({
    where: {
      searchType: LOCATION_SEARCH_TYPE,
      ...(cutoff ? { dateAdded: { gte: cutoff } } : {})
    },
    select: {
      subscriptionId: true,
      searchValue: true,
      userId: true,
      dateAdded: true
    }
  });

  const rows = subscriptions.map((subscription) => ({
    id: subscription.subscriptionId,
    search_value: subscription.searchValue,
    channel: DEFAULT_SUBSCRIPTION_CHANNEL,
    user_id: subscription.userId,
    court_name: resolveCourtName(subscription.searchValue),
    created_date: formatDate(subscription.dateAdded)
  }));

  return { name: "Location Subscriptions", headers: LOCATION_SUBSCRIPTIONS_HEADERS, rows };
}

export async function buildAllSubscriptionsSheet(cutoff?: Date, resolver?: CourtNameResolver): Promise<MiReportSheet> {
  const resolveCourtName = resolver ?? (await buildCourtNameResolver());

  const subscriptions = await prisma.subscription.findMany({
    where: cutoff ? { dateAdded: { gte: cutoff } } : undefined,
    select: {
      subscriptionId: true,
      searchType: true,
      searchValue: true,
      userId: true,
      dateAdded: true
    }
  });

  const rows = subscriptions.map((subscription) => ({
    id: subscription.subscriptionId,
    channel: DEFAULT_SUBSCRIPTION_CHANNEL,
    search_type: subscription.searchType,
    user_id: subscription.userId,
    court_name: subscription.searchType === LOCATION_SEARCH_TYPE ? resolveCourtName(subscription.searchValue) : "",
    created_date: formatDate(subscription.dateAdded)
  }));

  return { name: "All Subscriptions", headers: ALL_SUBSCRIPTIONS_HEADERS, rows };
}

function formatDate(date: Date | null | undefined): string {
  return date ? date.toISOString() : "";
}
