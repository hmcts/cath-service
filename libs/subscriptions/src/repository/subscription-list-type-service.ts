import { prisma } from "@hmcts/postgres";
import {
  deleteAllSubscriptionListTypesByUserId,
  findSubscriptionListTypeByUserId,
  getListTypeIdsForLocation,
  upsertSubscriptionListType
} from "./subscription-list-type-queries.js";

interface SubscriptionListTypeDto {
  subscriptionListTypeId: string;
  listTypeIds: number[];
  listTypeNames: string[];
  listLanguage: string[];
  dateAdded: Date;
}

function toListLanguage(language: string): string[] {
  if (language === "ENGLISH_AND_WELSH") return ["ENGLISH", "WELSH"];
  return [language];
}

export async function createSubscriptionListTypes(userId: string, listTypeIds: number[], language: string) {
  const listLanguage = toListLanguage(language);
  const existing = await findSubscriptionListTypeByUserId(userId);
  const mergedListTypeIds = [...new Set([...(existing?.listTypeIds ?? []), ...listTypeIds])];
  await upsertSubscriptionListType(userId, mergedListTypeIds, listLanguage);
}

export async function replaceSubscriptionListTypes(userId: string, listTypeIds: number[], language: string) {
  const listLanguage = toListLanguage(language);
  await upsertSubscriptionListType(userId, listTypeIds, listLanguage);
}

export async function getSubscriptionListTypesByUserId(userId: string): Promise<SubscriptionListTypeDto | null> {
  const record = await findSubscriptionListTypeByUserId(userId);
  if (!record) return null;

  const listTypeNames = await Promise.all(
    record.listTypeIds.map(async (id) => {
      const listType = await prisma.listType.findFirst({ where: { id } });
      return listType?.friendlyName ?? listType?.name ?? String(id);
    })
  );

  return {
    subscriptionListTypeId: record.subscriptionListTypeId,
    listTypeIds: record.listTypeIds,
    listTypeNames,
    listLanguage: record.listLanguage,
    dateAdded: record.dateAdded
  };
}

export async function removeSubscriptionListType(userId: string) {
  return deleteAllSubscriptionListTypesByUserId(userId);
}

export async function pruneStaleListTypesForUser(userId: string, removedLocationIds: number[], remainingLocationIds: number[]) {
  const existing = await findSubscriptionListTypeByUserId(userId);
  if (!existing) return;

  const [removedListTypeIdArrays, remainingListTypeIdArrays] = await Promise.all([
    Promise.all(removedLocationIds.map(getListTypeIdsForLocation)),
    Promise.all(remainingLocationIds.map(getListTypeIdsForLocation))
  ]);

  const removedSet = new Set(removedListTypeIdArrays.flat());
  const remainingSet = new Set(remainingListTypeIdArrays.flat());
  const idsToPrune = [...removedSet].filter((id) => !remainingSet.has(id));

  if (idsToPrune.length === 0) return;

  const pruneSet = new Set(idsToPrune);
  const updatedIds = existing.listTypeIds.filter((id) => !pruneSet.has(id));

  if (updatedIds.length === 0) {
    await deleteAllSubscriptionListTypesByUserId(userId);
  } else {
    await upsertSubscriptionListType(userId, updatedIds, existing.listLanguage);
  }
}
