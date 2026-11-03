import { afterEach, describe, expect, it, vi } from "vitest";
import { blobResubmit } from "./blob-resubmit.js";
import { configureListTypes } from "./configure-list-types.js";
import { courtReferenceData } from "./court-reference-data.js";
import { deleteUser } from "./delete-user.js";
import { type FakePageOptions, fakeContext, fakePage, SEEDED_PUBLICATION, seedResult, stubPipApis } from "./fake-journey.test-helper.js";
import { locationMetadata } from "./location-metadata.js";
import { manualUploadAndRemove } from "./manual-upload-and-remove.js";
import { mediaApplications } from "./media-applications.js";
import { subscriptionBasket } from "./subscription-basket.js";

const NO_METADATA: FakePageOptions = { counts: { 'main a[href*="location-metadata-delete-confirmation"]': 0 } };

function setUp(locale = "en", options: FakePageOptions = {}) {
  const fake = fakePage(options);
  const run = fakeContext(fake.page, locale, { seed: seedResult() });
  return { ...fake, ...run };
}

const failing = (status: number, text: string) => () => new Response(text, { status });

describe("pip journeys", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("blob-explorer-resubmit", () => {
    it("should open the seeded publication's location and artefact when browsing the blob explorer", async () => {
      // Arrange
      const { context, did } = setUp();

      // Act
      await blobResubmit.run(context);

      // Assert
      const clicked = did("click").map((entry) => entry.selector);
      expect(clicked).toContain(`main a[href$="locationId=${SEEDED_PUBLICATION.locationId}"] >> first`);
      expect(clicked).toContain(`main a[href*="artefactId=${SEEDED_PUBLICATION.artefactId}"] >> first`);
    });
  });

  describe("configure-list-types", () => {
    it("should leave the user with no subscriptions on the app's own origin when it finishes", async () => {
      // Arrange
      const { context, did } = setUp("en", { url: "http://pip.test:8080/subscription-configure-list-confirmed" });

      // Act
      await configureListTypes.run(context);

      // Assert
      expect(did("goto").at(-1)?.args[0]).toBe("http://pip.test:8080/bulk-unsubscribe");
    });
  });

  describe("subscription-basket", () => {
    it("should leave the user with no subscriptions when it finishes", async () => {
      // Arrange
      const { context, did } = setUp("cy", { url: "http://pip.test:8080/subscription-confirmed" });

      // Act
      await subscriptionBasket.run(context);

      // Assert
      expect(did("goto").at(-1)?.args[0]).toBe("http://pip.test:8080/bulk-unsubscribe");
    });
  });

  describe("court-reference-data", () => {
    it("should give the court a subscription and a publication through pip's APIs when the upload is confirmed", async () => {
      // Arrange
      const { calls } = stubPipApis();
      const { context, checkpoints } = setUp();

      // Act
      await courtReferenceData.run(context);

      // Assert
      expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
        "GET /account/provenance/PI_AAD/00000000-0000-4000-8000-0000000000d1",
        "POST /subscription",
        "POST /publication"
      ]);
      expect(JSON.parse(String(calls[1].init?.body))).toMatchObject({ searchValue: "9901", userId: "subscriber-1" });
      expect(calls[2].init?.headers).toMatchObject({ "x-court-id": "9901", "x-list-type": "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" });
      expect(checkpoints.map((checkpoint) => checkpoint.name)).not.toContain("reference-data-upload-card-not-found");
    });

    it("should record pip's missing Welsh upload page and go on by URL when run in Welsh", async () => {
      // Arrange
      stubPipApis();
      const { context, gotos, names, did } = setUp("cy");

      // Act
      await courtReferenceData.run(context);

      // Assert
      expect(names().slice(0, 3)).toEqual(["system-admin-dashboard", "reference-data-upload-card-not-found", "reference-data-upload"]);
      expect(gotos).toContain("/reference-data-upload");
      expect(did("fill").map((entry) => entry.args[0])).toContain("Llys Data Cyfeirnod Parity");
    });

    it("should stop when pip refuses the subscription", async () => {
      // Arrange
      stubPipApis({ "POST /subscription": failing(400, "bad subscription") });
      const { context } = setUp();

      // Act & Assert
      await expect(courtReferenceData.run(context)).rejects.toThrow("pip refused the court subscription: 400 bad subscription");
    });

    it("should stop when pip refuses the publication", async () => {
      // Arrange
      stubPipApis({ "POST /publication": failing(500, "bad publication") });
      const { context } = setUp();

      // Act & Assert
      await expect(courtReferenceData.run(context)).rejects.toThrow("pip refused the court publication: 500 bad publication");
    });
  });

  describe("delete-user", () => {
    it("should manage and delete the existing throwaway user when pip already has it", async () => {
      // Arrange
      const { calls } = stubPipApis();
      const { context, did } = setUp("cy");

      // Act
      await deleteUser.run(context);

      // Assert
      expect(calls.map((call) => call.method)).toEqual(["GET"]);
      expect(did("click").map((entry) => entry.selector)).toContain('main a[href*="manage-user?id=delete-cy"] >> first');
    });

    it("should create the throwaway user when pip does not have it yet", async () => {
      // Arrange
      let lookups = 0;
      const { calls } = stubPipApis({
        "GET /account/provenance/CFT_IDAM/parity-delete-en": () =>
          lookups++ === 0 ? new Response("not found", { status: 404 }) : new Response(JSON.stringify({ userId: "created-en" }))
      });
      const { context, did } = setUp("en");

      // Act
      await deleteUser.run(context);

      // Assert
      expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
        "GET /account/provenance/CFT_IDAM/parity-delete-en",
        "POST /account/add/pi",
        "GET /account/provenance/CFT_IDAM/parity-delete-en"
      ]);
      expect(JSON.parse(String(calls[1].init?.body))).toEqual([
        expect.objectContaining({ email: "parity.delete.en@example.com", provenanceUserId: "parity-delete-en", userProvenance: "CFT_IDAM" })
      ]);
      expect(did("click").map((entry) => entry.selector)).toContain('main a[href*="delete-user?id=created-en"] >> first');
    });

    it("should stop when pip cannot create the throwaway user", async () => {
      // Arrange
      stubPipApis({ "GET /account/provenance/CFT_IDAM/parity-delete-en": failing(404, "no such user") });
      const { context, checkpoints } = setUp("en");

      // Act & Assert
      await expect(deleteUser.run(context)).rejects.toThrow("could not create the user to delete: 404 no such user");
      expect(checkpoints).toHaveLength(0);
    });
  });

  describe("location-metadata", () => {
    it("should type the court's Welsh name when run in Welsh", async () => {
      // Arrange
      const { context, did } = setUp("cy", NO_METADATA);

      // Act
      await locationMetadata.run(context);

      // Assert
      expect(did("fill")[0].args).toEqual(["Canolfan Cyfiawnder Sifil Manceinion"]);
    });

    it("should refuse to go on when the court already has metadata", async () => {
      // Arrange
      const { context, names } = setUp("en", { counts: { 'main a[href*="location-metadata-delete-confirmation"]': 1 } });

      // Act & Assert
      await expect(locationMetadata.run(context)).rejects.toThrow("Manchester Civil Justice Centre already has location metadata");
      expect(names()).toEqual(["location-metadata-search", "location-metadata-search-error"]);
    });
  });

  describe("manual-upload-and-remove-list", () => {
    it("should upload the payload with today's and tomorrow's display dates when filling in the form", async () => {
      // Arrange
      const { context, did } = setUp();

      // Act
      await manualUploadAndRemove.run(context);

      // Assert
      const uploads = did("setInputFiles");
      expect(uploads).toHaveLength(2);
      expect((uploads[0].args[0] as { buffer: Buffer }).buffer.length).toBeGreaterThan(0);
      expect(did("selectOption").map((entry) => entry.args[0])).toEqual(["CIVIL_AND_FAMILY_DAILY_CAUSE_LIST", "PUBLIC", "ENGLISH"]);
      expect(did("fill").find((entry) => entry.selector === "#display-date-from-year")?.args[0]).toMatch(/^\d{4}$/);
    });

    it("should stop when the court has more than the uploaded list", async () => {
      // Arrange
      const { context, names } = setUp("en", { counts: { 'main input[type=checkbox][name="courtLists"]': 2 } });

      // Act & Assert
      await expect(manualUploadAndRemove.run(context)).rejects.toThrow("expected only the uploaded list at Manchester Civil Justice Centre, found 2");
      expect(names().at(-1)).toBe("remove-list-search-results-error");
    });
  });

  describe("media-applications", () => {
    it("should create both applications when none is pending", async () => {
      // Arrange
      const { calls } = stubPipApis();
      const { context } = setUp("cy");

      // Act
      await mediaApplications.run(context);

      // Assert
      const created = calls.filter((call) => call.method === "POST").map((call) => ((call.init as RequestInit).body as FormData).get("email"));
      expect(created).toEqual(["parity.approve.cy@example.com", "parity.reject.cy@example.com"]);
    });

    it("should reuse a pending application with the same email when one exists", async () => {
      // Arrange
      const pending = [
        { id: "pending-approve", email: "parity.approve.en@example.com" },
        { id: "pending-reject", email: "parity.reject.en@example.com" }
      ];
      const { calls } = stubPipApis({ "GET /application/status/PENDING": () => new Response(JSON.stringify(pending)) });
      const { context, gotos } = setUp("en");

      // Act
      await mediaApplications.run(context);

      // Assert
      expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
      expect(gotos).toContain("/media-account-approval-confirmation?applicantId=pending-approve");
      expect(gotos).toContain("/media-account-rejection-reasons?applicantId=pending-reject");
    });

    it("should stop when pip refuses an application", async () => {
      // Arrange
      stubPipApis({ "POST /application": failing(400, "invalid") });
      const { context } = setUp("en");

      // Act & Assert
      await expect(mediaApplications.run(context)).rejects.toThrow("pip refused application parity.approve.en@example.com: 400 invalid");
    });
  });
});
