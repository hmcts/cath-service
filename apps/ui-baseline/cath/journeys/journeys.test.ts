import { describe, expect, it } from "vitest";
import { CATH_LIST_TYPES, cathData, type FakePageOptions, fakeContext, fakePage, SEEDED_PUBLICATION } from "../../pip/journeys/fake-journey.test-helper.js";
import { blobResubmit } from "./blob-resubmit.js";
import { bulkCreateMediaAccounts } from "./bulk-create-media-accounts.js";
import { configureListTypes } from "./configure-list-types.js";
import { courtReferenceData } from "./court-reference-data.js";
import { deleteUser } from "./delete-user.js";
import type { CathJourneyData } from "./index.js";
import { listTypeSearchConfig } from "./list-type-search-config.js";
import { locationMetadata } from "./location-metadata.js";
import { manualUploadAndRemove } from "./manual-upload-and-remove.js";
import { mediaApplications } from "./media-applications.js";
import { subscriptionBasket } from "./subscription-basket.js";
import { subscriptions } from "./subscriptions.js";
import { thirdPartySubscriber } from "./third-party-subscriber.js";
import { thirdPartyUser } from "./third-party-user.js";

const ORIGIN = "https://cath.test:8080";
const SAVED = `${ORIGIN}/third-party-subscribers/s1/subscriptions/success`;
const MANAGE = `${ORIGIN}/third-party-subscribers/s1/subscriptions/manage`;
const NO_METADATA: FakePageOptions = { counts: { 'main form button[name="action"][value="delete"]': 0 } };

function setUp(options: { locale?: string; page?: FakePageOptions; data?: Partial<CathJourneyData> } = {}) {
  const fake = fakePage({ url: `${ORIGIN}/somewhere`, ...options.page });
  const { data, records } = cathData(options.data);
  const run = fakeContext(fake.page, options.locale ?? "en", data);
  return { ...fake, ...run, records };
}

// Alternates the save page and the saved page, so each save in the paged form takes one page
function onePagedSave(): () => string {
  let calls = 0;
  return () => (calls++ % 2 === 0 ? MANAGE : SAVED);
}

const without = (name: string) => {
  const { [name]: _removed, ...rest } = CATH_LIST_TYPES;
  return { listTypes: rest };
};

describe("CaTH journeys", () => {
  describe("blob-explorer-resubmit", () => {
    it("should capture the locations page with no note when the dashboard tile leads there", async () => {
      // Arrange
      const { context, checkpoints, gotos } = setUp({ page: { url: `${ORIGIN}/blob-explorer-locations` } });

      // Act
      await blobResubmit.run(context);

      // Assert
      expect(checkpoints[0]).toEqual({ name: "blob-view-locations" });
      expect(gotos).toEqual(["/system-admin-dashboard"]);
    });

    it("should open the locations page by URL and say so when the tile leads nowhere", async () => {
      // Arrange
      const { context, checkpoints, gotos, did } = setUp({ page: { url: `${ORIGIN}/blob-explorer` } });

      // Act
      await blobResubmit.run(context);

      // Assert
      expect(gotos).toEqual(["/system-admin-dashboard", "/blob-explorer-locations"]);
      expect(checkpoints[0].note).toContain("reached by URL");
      expect(did("click").map((entry) => entry.selector)).toContain(`main a[href*="artefactId=${SEEDED_PUBLICATION.artefactId}"] >> first`);
    });

    it("should stop before navigating when CaTH was not seeded", async () => {
      // Arrange
      const { context, gotos } = setUp({ data: { seed: null } });

      // Act & Assert
      await expect(blobResubmit.run(context)).rejects.toThrow("CaTH was not seeded with civil-and-family-daily-cause-list");
      expect(gotos).toHaveLength(0);
    });
  });

  describe("bulk-create-media-accounts", () => {
    it("should do nothing when run, as CaTH has no bulk create pages", async () => {
      // Arrange
      const { context, checkpoints, actions } = setUp();

      // Act
      await bulkCreateMediaAccounts.run(context);

      // Assert
      expect(checkpoints).toHaveLength(0);
      expect(actions).toHaveLength(0);
    });
  });

  describe("configure-list-types", () => {
    it("should select list types by their CaTH id and remove the family list's form when editing", async () => {
      // Arrange
      const { context, did } = setUp();

      // Act
      await configureListTypes.run(context);

      // Assert
      expect(did("uncheck").map((entry) => entry.selector)).toEqual(["#listType_8"]);
      expect(did("click").map((entry) => entry.selector)).toContain(
        'main form >> filter(has=input[name=listTypeId][value="2"]) >> filter(has=input[name=action][value="remove-list-type"]) >> button'
      );
      expect(did("goto").at(-1)?.args[0]).toBe(`${ORIGIN}/bulk-unsubscribe`);
    });

    it("should stop when CaTH has no list type of a name it needs", async () => {
      // Arrange
      const { context } = setUp({ data: without("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST") });

      // Act & Assert
      await expect(configureListTypes.run(context)).rejects.toThrow("CaTH has no CIVIL_AND_FAMILY_DAILY_CAUSE_LIST list type");
    });
  });

  describe("court-reference-data", () => {
    it("should give the court a subscription and a current publication when the upload is confirmed", async () => {
      // Arrange
      const { context, records } = setUp();

      // Act
      await courtReferenceData.run(context);

      // Assert
      expect(records.ensureSubscription).toHaveBeenCalledWith("cath-subscriber-id", "LOCATION_ID", "9901");
      const [publication] = records.createPublication.mock.calls[0] as unknown as [{ displayFrom: string; displayTo: string }];
      expect(publication).toMatchObject({ locationId: "9901", listTypeId: 8, contentDate: "2022-04-01" });
      expect(Date.parse(publication.displayFrom)).toBeLessThan(Date.now());
      expect(Date.parse(publication.displayTo)).toBeGreaterThan(Date.now());
    });

    it("should stop when the subscriber has no CaTH account", async () => {
      // Arrange
      const { context, records } = setUp({ data: { users: {} } });

      // Act & Assert
      await expect(courtReferenceData.run(context)).rejects.toThrow("no CaTH account for journey-subscriber");
      expect(records.createPublication).not.toHaveBeenCalled();
    });

    it("should stop when CaTH has no civil and family list type", async () => {
      // Arrange
      const { context, records } = setUp({ data: without("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST") });

      // Act & Assert
      await expect(courtReferenceData.run(context)).rejects.toThrow("CaTH has no CIVIL_AND_FAMILY_DAILY_CAUSE_LIST list type");
      expect(records.ensureSubscription).not.toHaveBeenCalled();
    });
  });

  describe("delete-user", () => {
    it("should make its own CFT IDAM user for the locale and delete that one", async () => {
      // Arrange
      const { context, records, did } = setUp({ locale: "cy" });

      // Act
      await deleteUser.run(context);

      // Assert
      expect(records.ensureUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: "parity.delete.cy@example.com", userProvenance: "CFT_IDAM", userProvenanceId: "parity-delete-cy" })
      );
      expect(did("click").map((entry) => entry.selector)).toContain('main form[action^="/delete-user-confirm/user-42"] button');
    });
  });

  describe("list-type-search-config", () => {
    it("should set pip's search fields first and put back what was there when it finishes", async () => {
      // Arrange
      const { context, records, gotos } = setUp();

      // Act
      await listTypeSearchConfig.run(context);

      // Assert
      expect(records.replaceListSearchConfig.mock.calls).toEqual([
        [8, { caseNumberFieldName: "caseNumber", caseNameFieldName: "caseName" }],
        [8, { caseNumberFieldName: "previousNumber", caseNameFieldName: "previousName" }]
      ]);
      expect(gotos).toContain("/list-search-config/8");
    });

    it("should put back the original search fields when a step fails", async () => {
      // Arrange
      const { context, records } = setUp({ page: { failOn: "govuk-button" } });

      // Act & Assert
      await expect(listTypeSearchConfig.run(context)).rejects.toThrow("no element");
      expect(records.replaceListSearchConfig).toHaveBeenLastCalledWith(8, { caseNumberFieldName: "previousNumber", caseNameFieldName: "previousName" });
    });

    it("should change nothing when CaTH has no civil and family list type", async () => {
      // Arrange
      const { context, records } = setUp({ data: without("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST") });

      // Act & Assert
      await expect(listTypeSearchConfig.run(context)).rejects.toThrow("CaTH has no CIVIL_AND_FAMILY_DAILY_CAUSE_LIST list type");
      expect(records.replaceListSearchConfig).not.toHaveBeenCalled();
    });
  });

  describe("location-metadata", () => {
    it("should create, update and delete through the manage page's action buttons", async () => {
      // Arrange
      const { context, did } = setUp({ page: NO_METADATA });

      // Act
      await locationMetadata.run(context);

      // Assert
      const actions = did("click")
        .map((entry) => entry.selector)
        .filter((selector) => selector.includes('name="action"'));
      expect(actions).toEqual([
        'main form button[name="action"][value="create"]',
        'main form button[name="action"][value="update"]',
        'main form button[name="action"][value="delete"]'
      ]);
    });

    it("should refuse to go on when the court already has metadata", async () => {
      // Arrange
      const { context, names } = setUp();

      // Act & Assert
      await expect(locationMetadata.run(context)).rejects.toThrow("Manchester Civil Justice Centre already has location metadata");
      expect(names()).toEqual(["location-metadata-search", "location-metadata-search-error"]);
    });
  });

  describe("manual-upload-and-remove-list", () => {
    it("should choose the list type by its CaTH id when filling in the upload form", async () => {
      // Arrange
      const { context, did } = setUp();

      // Act
      await manualUploadAndRemove.run(context);

      // Assert
      expect(did("selectOption").map((entry) => entry.args[0])).toEqual(["8", "PUBLIC", "ENGLISH"]);
      expect(did("setInputFiles")).toHaveLength(2);
    });

    it("should stop when the court has more than the uploaded list", async () => {
      // Arrange
      const { context } = setUp({ page: { counts: { 'main input[type=checkbox][name="artefacts"]': 0 } } });

      // Act & Assert
      await expect(manualUploadAndRemove.run(context)).rejects.toThrow("expected only the uploaded list at Manchester Civil Justice Centre, found 0");
    });

    it("should stop when CaTH has no civil and family list type", async () => {
      // Arrange
      const { context, gotos } = setUp({ data: without("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST") });

      // Act & Assert
      await expect(manualUploadAndRemove.run(context)).rejects.toThrow("CaTH has no CIVIL_AND_FAMILY_DAILY_CAUSE_LIST list type");
      expect(gotos).toHaveLength(0);
    });
  });

  describe("media-applications", () => {
    it("should make its own two applications for the locale and remove both when it finishes", async () => {
      // Arrange
      const { context, records, gotos } = setUp({ locale: "cy" });

      // Act
      await mediaApplications.run(context);

      // Assert
      expect(records.ensureMediaApplication.mock.calls.map(([application]) => application)).toEqual([
        { name: "Parity Approve CY", email: "parity.approve.cy@example.com", employer: "Parity News" },
        { name: "Parity Reject CY", email: "parity.reject.cy@example.com", employer: "Parity News" }
      ]);
      expect(gotos).toContain("/media-applications/application-parity.approve.cy@example.com/approved");
      expect(records.removeMediaApplication.mock.calls).toEqual([["application-parity.approve.cy@example.com"], ["application-parity.reject.cy@example.com"]]);
    });

    it("should still remove both applications when a step fails", async () => {
      // Arrange
      const { context, records } = setUp({ page: { failOn: "reject-reasons" } });

      // Act & Assert
      await expect(mediaApplications.run(context)).rejects.toThrow("no element");
      expect(records.removeMediaApplication).toHaveBeenCalledTimes(2);
    });
  });

  describe("subscription-basket", () => {
    it("should remove courts and change the language through the inline forms", async () => {
      // Arrange
      const { context, did } = setUp();

      // Act
      await subscriptionBasket.run(context);

      // Assert
      const clicked = did("click").map((entry) => entry.selector);
      expect(clicked).toContain(
        'main form >> filter(has=input[name=action][value="remove-location"]) >> filter(has=input[name=locationId][value="2"]) >> button >> first'
      );
      expect(clicked).toContain('main form >> filter(has=input[name=action][value="change-version"]) >> button >> first');
      expect(did("check").map((entry) => entry.selector)).toContain("#listType_1");
    });

    it("should stop when CaTH has no civil list type", async () => {
      // Arrange
      const { context } = setUp({ data: without("CIVIL_DAILY_CAUSE_LIST") });

      // Act & Assert
      await expect(subscriptionBasket.run(context)).rejects.toThrow("CaTH has no CIVIL_DAILY_CAUSE_LIST list type");
    });
  });

  describe("email-subscriptions", () => {
    it("should index the seeded publication's cases and put the search set-up back when it finishes", async () => {
      // Arrange
      const { context, records, did } = setUp();

      // Act
      await subscriptions.run(context);

      // Assert
      expect(records.replaceListSearchConfig.mock.calls).toEqual([
        [8, { caseNumberFieldName: "caseNumber", caseNameFieldName: "caseName" }],
        [8, { caseNumberFieldName: "previousNumber", caseNameFieldName: "previousName" }]
      ]);
      expect(records.indexPublicationCases).toHaveBeenCalledWith(SEEDED_PUBLICATION.artefactId, expect.any(Object));
      expect(records.restorePublicationCases).toHaveBeenCalledWith(SEEDED_PUBLICATION.artefactId, [{ caseNumber: "1", caseName: "previous" }]);
      expect(did("check").map((entry) => entry.selector)).toContain(`#location-${SEEDED_PUBLICATION.locationId}`);
      expect(did("goto").at(-1)?.args[0]).toBe(`${ORIGIN}/bulk-unsubscribe`);
    });

    it("should put the search set-up back and unsubscribe from everything when a step fails", async () => {
      // Arrange
      const { context, records, did, names } = setUp({ page: { failOn: "#caseReference" } });

      // Act & Assert
      await expect(subscriptions.run(context)).rejects.toThrow("no element");
      expect(names().at(-1)).toBe("case-reference-number-search-error");
      expect(records.restorePublicationCases).toHaveBeenCalledOnce();
      expect(records.replaceListSearchConfig).toHaveBeenCalledTimes(2);
      expect(did("goto").at(-1)?.args[0]).toBe(`${ORIGIN}/bulk-unsubscribe`);
    });

    it("should stop before changing anything when CaTH was not seeded", async () => {
      // Arrange
      const { context, records } = setUp({ data: { seed: null } });

      // Act & Assert
      await expect(subscriptions.run(context)).rejects.toThrow("CaTH was not seeded with civil-and-family-daily-cause-list");
      expect(records.replaceListSearchConfig).not.toHaveBeenCalled();
    });

    it("should stop before changing anything when CaTH has no civil list type", async () => {
      // Arrange
      const { context, records } = setUp({ data: without("CIVIL_DAILY_CAUSE_LIST") });

      // Act & Assert
      await expect(subscriptions.run(context)).rejects.toThrow("CaTH has no CIVIL_DAILY_CAUSE_LIST list type");
      expect(records.replaceListSearchConfig).not.toHaveBeenCalled();
    });
  });

  describe("third-party-subscriber", () => {
    it("should remove any subscriber left with its name before creating one", async () => {
      // Arrange
      const { context, records, did } = setUp({ locale: "cy", page: { url: onePagedSave() } });

      // Act
      await thirdPartySubscriber.run(context);

      // Assert
      expect(records.removeThirdPartySubscribers).toHaveBeenCalledWith("Parity Journey Subscriber CY");
      expect(did("fill")[0]).toEqual({ selector: "#name", action: "fill", args: ["Parity Journey Subscriber CY"] });
    });

    it("should choose Public from the list type's select when the form shows selects", async () => {
      // Arrange
      const { context, did } = setUp({ page: { url: onePagedSave() } });

      // Act
      await thirdPartySubscriber.run(context);

      // Assert
      expect(did("selectOption")).toEqual([
        { selector: 'select[name="CIVIL_DAILY_CAUSE_LIST"]', action: "selectOption", args: ["PUBLIC"] },
        { selector: 'select[name="FAMILY_DAILY_CAUSE_LIST"]', action: "selectOption", args: ["PUBLIC"] }
      ]);
    });

    it("should tick the Public radio when the form shows radios", async () => {
      // Arrange
      const counts = { 'select[name="CIVIL_DAILY_CAUSE_LIST"]': 0, 'select[name="FAMILY_DAILY_CAUSE_LIST"]': 0 };
      const { context, did } = setUp({ page: { url: onePagedSave(), counts } });

      // Act
      await thirdPartySubscriber.run(context);

      // Assert
      expect(did("selectOption")).toHaveLength(0);
      expect(did("check").map((entry) => entry.selector)).toEqual(
        expect.arrayContaining(['input[name="CIVIL_DAILY_CAUSE_LIST"][value="PUBLIC"]', 'input[name="FAMILY_DAILY_CAUSE_LIST"][value="PUBLIC"]'])
      );
    });

    it("should page on without choosing when the list type is not on this page", async () => {
      // Arrange
      let calls = 0;
      const url = () => [MANAGE, MANAGE, SAVED][calls++ % 3];
      const counts = {
        'select[name="CIVIL_DAILY_CAUSE_LIST"]': 0,
        'input[name="CIVIL_DAILY_CAUSE_LIST"][value="PUBLIC"]': 0,
        'select[name="FAMILY_DAILY_CAUSE_LIST"]': 0,
        'input[name="FAMILY_DAILY_CAUSE_LIST"][value="PUBLIC"]': 0
      };
      const { context, did } = setUp({ page: { url, counts } });

      // Act
      await thirdPartySubscriber.run(context);

      // Assert
      expect(did("selectOption")).toHaveLength(0);
      expect(did("check").map((entry) => entry.selector)).not.toContain('input[name="CIVIL_DAILY_CAUSE_LIST"][value="PUBLIC"]');
    });

    it("should give up when the subscriptions form never reaches the saved page", async () => {
      // Arrange
      const { context, names } = setUp({ page: { url: MANAGE } });

      // Act & Assert
      await expect(thirdPartySubscriber.run(context)).rejects.toThrow(`never reached the subscriptions saved page, at ${MANAGE}`);
      expect(names().at(-1)).toBe("manage-third-party-subscriptions");
    });
  });

  describe("legacy-third-party-user", () => {
    it("should remove any user left with its name and subscribe by CaTH list type id", async () => {
      // Arrange
      const { context, records, did } = setUp();

      // Act
      await thirdPartyUser.run(context);

      // Assert
      expect(records.removeLegacyThirdPartyUsers).toHaveBeenCalledWith("Parity Journey Third Party EN");
      expect(did("check").map((entry) => entry.selector)).toContain('input[name="listTypes"][value="1"]');
    });

    it("should stop when CaTH has no civil list type", async () => {
      // Arrange
      const { context, records } = setUp({ data: without("CIVIL_DAILY_CAUSE_LIST") });

      // Act & Assert
      await expect(thirdPartyUser.run(context)).rejects.toThrow("CaTH has no CIVIL_DAILY_CAUSE_LIST list type");
      expect(records.removeLegacyThirdPartyUsers).not.toHaveBeenCalled();
    });
  });
});
