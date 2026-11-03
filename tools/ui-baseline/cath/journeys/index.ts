import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type JourneySuite, openBlobContainer } from "@hmcts/ui-baseline";
import type { Page } from "playwright";
import { filesStorage, loadEnvironment } from "../../environments.js";
import type { SeedResult } from "../../fixtures/manifest.js";
import { prismaRecordStore, type RecordStore, testSupportRecordStore } from "../records.js";
import type { SignInResult } from "../sign-in.js";
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

// CaTH's journeys for `parity journeys --module`, compared with pip's journey of the same id.
// Only journeys ported so far are here; check.ts reports the rest of pip's as not run. Needs the
// sign-in file cath/sign-in.ts writes and the seed file cath/seed.ts writes (check.ts runs both
// first, seeding fixtures.ts's publications); PARITY_TARGET overrides the base URL.
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const config = JSON.parse(await readFile(path.join(PARITY_DIR, "apps.json"), "utf-8")).cath;
const environment = await loadEnvironment();
const baseUrl = process.env.PARITY_TARGET ?? environment.cath.baseUrl;
const signInFile = process.env.PARITY_SIGN_IN_OUTPUT ?? path.join(PARITY_DIR, "output/seed", `cath-sign-in-${environment.name}.json`);
const seedFile = process.env.PARITY_SEED_OUTPUT ?? path.join(PARITY_DIR, "output/seed", `cath-check-${environment.name}.json`);
const readJson = async <T>(file: string) => JSON.parse(await readFile(file, "utf-8").catch(() => "null")) as T | null;
const signedIn = await readJson<SignInResult>(signInFile);
const seed = await readJson<SeedResult>(seedFile);
// Journeys that change data make their own records through this, as pip's create theirs through
// pip's APIs: straight into a local CaTH's database, or through a deployed one's test-support API
const records: RecordStore =
  environment.cath.signIn === "session"
    ? await prismaRecordStore()
    : testSupportRecordStore(environment.cath.apiUrl, openBlobContainer(filesStorage("cath", environment.cath, "files")));

const suite: JourneySuite = {
  app: "cath",
  baseUrl,
  cookies: config.cookies,
  data: {
    // CaTH's list type ids by name, which differ between environments
    listTypes: signedIn?.listTypes ?? {},
    // The fixture publications CaTH was seeded with (artefactId, locationId), by fixture id
    seed,
    // Each fixture user's CaTH account id, and the records sign-in made (records.json), by id
    users: Object.fromEntries(Object.entries(signedIn?.users ?? {}).map(([id, user]) => [id, user.userId])),
    seededRecords: signedIn?.records ?? {},
    records,
    apiUrl: environment.cath.apiUrl
  } satisfies CathJourneyData,
  signIn: async (page: Page, userId: string, locale: string) => {
    if (!signedIn) throw new Error(`no CaTH sign-in at ${signInFile}: run cath/sign-in.ts first`);
    const unavailable = signedIn.unavailable[userId];
    if (unavailable) throw new Error(`${userId} cannot sign in to CaTH here: ${unavailable}`);
    const cookies = signedIn.users[userId]?.cookies[locale];
    if (!cookies) throw new Error(`no CaTH session for ${userId} (${locale}) in ${signInFile}`);
    await page.context().addCookies(cookies.map((cookie) => ({ ...cookie, url: baseUrl })));
  },
  journeys: [
    subscriptionBasket,
    subscriptions,
    configureListTypes,
    blobResubmit,
    thirdPartyUser,
    thirdPartySubscriber,
    deleteUser,
    listTypeSearchConfig,
    bulkCreateMediaAccounts,
    courtReferenceData,
    locationMetadata,
    manualUploadAndRemove,
    mediaApplications
  ]
};

export default suite;

// What CaTH's journeys find in their context's data
export interface CathJourneyData {
  listTypes: Record<string, string>;
  seed: SeedResult | null;
  users: Record<string, string>;
  seededRecords: SignInResult["records"];
  records: RecordStore;
  apiUrl: string;
}
