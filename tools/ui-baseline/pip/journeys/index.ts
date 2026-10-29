import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { JourneySuite } from "@hmcts/ui-baseline";
import type { Page } from "playwright";
import { loadUsers, type SeedResult } from "../../fixtures/manifest.js";
import { blobResubmit } from "./blob-resubmit.js";
import { bulkCreateMediaAccounts } from "./bulk-create-media-accounts.js";
import { configureListTypes } from "./configure-list-types.js";
import { courtReferenceData } from "./court-reference-data.js";
import { deleteUser } from "./delete-user.js";
import { listTypeSearchConfig } from "./list-type-search-config.js";
import { locationMetadata } from "./location-metadata.js";
import { manualUploadAndRemove } from "./manual-upload-and-remove.js";
import { mediaApplications } from "./media-applications.js";
import { subscriptionBasket } from "./subscription-basket.js";
import { subscriptions } from "./subscriptions.js";
import { thirdPartySubscriber } from "./third-party-subscriber.js";
import { thirdPartyUser } from "./third-party-user.js";

// pip journeys for `parity journeys --module`. Journeys run in order against a freshly seeded
// pip stack; any that change data use their own users or records so they cannot affect one another.
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SIGN_IN = {
  PI_AAD: { key: "oid", flow: "AAD" },
  SSO: { key: "oid", flow: "SSO" },
  CFT_IDAM: { key: "uid", flow: "CFT" },
  CRIME_IDAM: { key: "uid", flow: "Crime" }
} as const;

const config = JSON.parse(await readFile(path.join(PARITY_DIR, "apps.json"), "utf-8")).pip;
const seed = JSON.parse(await readFile(path.join(PARITY_DIR, "output/seed/pip.json"), "utf-8")) as SeedResult;
const users = new Map((await loadUsers()).map((user) => [user.id, user]));

const suite: JourneySuite = {
  app: "pip",
  baseUrl: config.baseUrl,
  cookies: config.cookies,
  data: { seed },
  signIn: async (page: Page, userId: string) => {
    const user = users.get(userId);
    if (!user) throw new Error(`unknown parity user ${userId}`);
    const { key, flow } = SIGN_IN[user.provenance];
    await page.goto(`${config.baseUrl}${config.signIn.replace("{key}", key).replace("{provenanceUserId}", user.provenanceUserId).replace("{flow}", flow)}`);
  },
  journeys: [
    subscriptions,
    subscriptionBasket,
    configureListTypes,
    manualUploadAndRemove,
    mediaApplications,
    courtReferenceData,
    thirdPartyUser,
    thirdPartySubscriber,
    locationMetadata,
    listTypeSearchConfig,
    bulkCreateMediaAccounts,
    blobResubmit,
    deleteUser
  ]
};

export default suite;
