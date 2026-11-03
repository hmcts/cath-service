import { afterEach, describe, expect, it, vi } from "vitest";
import type { Journey } from "../../core/index.js";
import { blobResubmit as pipBlobResubmit } from "../../pip/journeys/blob-resubmit.js";
import { bulkCreateMediaAccounts as pipBulkCreateMediaAccounts } from "../../pip/journeys/bulk-create-media-accounts.js";
import { configureListTypes as pipConfigureListTypes } from "../../pip/journeys/configure-list-types.js";
import { courtReferenceData as pipCourtReferenceData } from "../../pip/journeys/court-reference-data.js";
import { deleteUser as pipDeleteUser } from "../../pip/journeys/delete-user.js";
import { cathData, type FakePageOptions, fakeContext, fakePage, seedResult, stubPipApis } from "../../pip/journeys/fake-journey.test-helper.js";
import { listTypeSearchConfig as pipListTypeSearchConfig } from "../../pip/journeys/list-type-search-config.js";
import { locationMetadata as pipLocationMetadata } from "../../pip/journeys/location-metadata.js";
import { manualUploadAndRemove as pipManualUploadAndRemove } from "../../pip/journeys/manual-upload-and-remove.js";
import { mediaApplications as pipMediaApplications } from "../../pip/journeys/media-applications.js";
import { subscriptionBasket as pipSubscriptionBasket } from "../../pip/journeys/subscription-basket.js";
import { subscriptions as pipSubscriptions } from "../../pip/journeys/subscriptions.js";
import { thirdPartySubscriber as pipThirdPartySubscriber } from "../../pip/journeys/third-party-subscriber.js";
import { thirdPartyUser as pipThirdPartyUser } from "../../pip/journeys/third-party-user.js";
import { blobResubmit } from "./blob-resubmit.js";
import { bulkCreateMediaAccounts } from "./bulk-create-media-accounts.js";
import { configureListTypes } from "./configure-list-types.js";
import { courtReferenceData } from "./court-reference-data.js";
import { deleteUser } from "./delete-user.js";
import { JOURNEY_PUBLICATIONS } from "./fixtures.js";
import { listTypeSearchConfig } from "./list-type-search-config.js";
import { locationMetadata } from "./location-metadata.js";
import { manualUploadAndRemove } from "./manual-upload-and-remove.js";
import { mediaApplications } from "./media-applications.js";
import { subscriptionBasket } from "./subscription-basket.js";
import { subscriptions } from "./subscriptions.js";
import { thirdPartySubscriber } from "./third-party-subscriber.js";
import { thirdPartyUser } from "./third-party-user.js";

// The comparison pairs pip's and CaTH's checkpoints by name, so a CaTH port must reach pip's
// checkpoints in pip's order, leaving out only the steps its comments say CaTH does not have.
// An accidental rename or drop shows up here as an unexpected omission.
const PAIRS: Pair[] = [
  { pip: pipBlobResubmit, cath: blobResubmit, omitted: { en: [], cy: [] } },
  {
    pip: pipBulkCreateMediaAccounts,
    cath: bulkCreateMediaAccounts,
    omitted: {
      en: [
        "bulk-create-media-accounts",
        "bulk-create-media-accounts-error",
        "bulk-create-media-accounts-confirmation",
        "bulk-create-media-accounts-confirmation-error",
        "bulk-create-media-accounts-confirmed"
      ]
    }
  },
  { pip: pipConfigureListTypes, cath: configureListTypes, omitted: { en: [], cy: [] } },
  { pip: pipCourtReferenceData, cath: courtReferenceData, omitted: { en: [], cy: ["reference-data-upload-card-not-found"] } },
  { pip: pipDeleteUser, cath: deleteUser, omitted: { en: [], cy: [] } },
  { pip: pipListTypeSearchConfig, cath: listTypeSearchConfig, omitted: { en: ["edit-list-type-search-config-summary"] } },
  {
    pip: pipLocationMetadata,
    cath: locationMetadata,
    omitted: { en: [], cy: [] },
    pipPage: { counts: { 'main a[href*="location-metadata-delete-confirmation"]': 0 } },
    cathPage: { counts: { 'main form button[name="action"][value="delete"]': 0 } }
  },
  { pip: pipManualUploadAndRemove, cath: manualUploadAndRemove, omitted: { en: ["remove-list-confirmation-yes-after-error"] } },
  { pip: pipMediaApplications, cath: mediaApplications, omitted: { en: ["media-account-rejection-yes-after-error"] } },
  { pip: pipSubscriptionBasket, cath: subscriptionBasket, omitted: { en: [], cy: [] } },
  { pip: pipSubscriptions, cath: subscriptions, omitted: { en: [], cy: [] } },
  {
    pip: pipThirdPartySubscriber,
    cath: thirdPartySubscriber,
    omitted: {
      en: ["manage-third-party-subscriber-status", "manage-third-party-subscriber-status-success", "manage-third-party-subscriptions-summary"]
    },
    // Each save page is followed by the saved page, so CaTH's paged form is one page long
    cathPage: () => {
      let calls = 0;
      return {
        url: () =>
          calls++ % 2 === 0
            ? "http://localhost:8080/third-party-subscribers/s1/subscriptions/manage"
            : "http://localhost:8080/third-party-subscribers/s1/subscriptions/success"
      };
    }
  },
  { pip: pipThirdPartyUser, cath: thirdPartyUser, omitted: { en: [], cy: [] } }
];
const LOCALES = ["en", "cy"] as const;

async function checkpointNames(journey: Journey, locale: string, data: Record<string, unknown>, options: FakePageOptions) {
  const { page } = fakePage(options);
  const run = fakeContext(page, locale, data);
  await journey.run(run.context);
  return run.names();
}

function pageOptions(options: Pair["pipPage"], fallback: FakePageOptions = {}): FakePageOptions {
  if (!options) return fallback;
  return typeof options === "function" ? options() : options;
}

// The names in pip's order that CaTH did not reach, or null when CaTH's are not a subsequence of pip's
function omissions(pip: string[], cath: string[]): string[] | null {
  const omitted: string[] = [];
  let next = 0;
  for (const name of pip) {
    if (cath[next] === name) next++;
    else omitted.push(name);
  }
  return next === cath.length ? omitted : null;
}

describe("CaTH journey ports", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should port every pip journey once, under the same id", () => {
    // Arrange
    const pipIds = PAIRS.map((pair) => pair.pip.id);

    // Act
    const cathIds = PAIRS.map((pair) => pair.cath.id);

    // Assert
    expect(cathIds).toEqual(pipIds);
    expect(new Set(cathIds).size).toBe(PAIRS.length);
  });

  describe.each(PAIRS.map((pair) => [pair.pip.id, pair] as const))("%s", (_id, pair) => {
    it("should sign in as the same user as pip's when compared", () => {
      // Act
      const viewAs = pair.cath.viewAs;

      // Assert
      expect(viewAs).toBe(pair.pip.viewAs);
    });

    it.each(LOCALES)("should reach pip's checkpoints in pip's order, omitting only the documented steps, when run in %s", async (locale) => {
      // Arrange
      stubPipApis();
      const expected = pair.omitted[locale] ?? pair.omitted.en;
      const pipData = { seed: seedResult() };

      // Act
      const pip = await checkpointNames(pair.pip, locale, pipData, pageOptions(pair.pipPage));
      const cath = await checkpointNames(
        pair.cath,
        locale,
        cathData().data,
        pageOptions(pair.cathPage, { url: "http://localhost:8080/blob-explorer-locations" })
      );

      // Assert
      expect(pip.length).toBeGreaterThan(0);
      expect(new Set(pip).size).toBe(pip.length);
      expect(omissions(pip, cath)).toEqual(expected);
    });
  });
});

interface Pair {
  pip: Journey;
  cath: Journey;
  // pip's checkpoints the port does not reach, by locale; cy falls back to en
  omitted: { en: string[]; cy?: string[] };
  pipPage?: FakePageOptions | (() => FakePageOptions);
  cathPage?: FakePageOptions | (() => FakePageOptions);
}

describe("JOURNEY_PUBLICATIONS", () => {
  it("should include the publication the ported journeys open when check.ts seeds CaTH", () => {
    // Act
    const seeded = JOURNEY_PUBLICATIONS;

    // Assert
    expect(seeded).toContain("civil-and-family-daily-cause-list");
  });
});
