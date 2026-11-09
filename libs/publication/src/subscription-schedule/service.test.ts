import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicationJson } from "../file-storage/file-retrieval.js";
import { pushPublicationToThirdParties, sendPublicationNotificationsForArtefact } from "../processing/service.js";
import { findArtefactsDisplayedFromToday, findScheduledListTypeArtefactsForToday } from "./queries.js";
import { triggerDisplayFromSubscriptions, triggerScheduledListTypeSubscriptions } from "./service.js";

vi.mock("../file-storage/file-retrieval.js", () => ({
  getPublicationJson: vi.fn()
}));

vi.mock("../processing/service.js", () => ({
  pushPublicationToThirdParties: vi.fn(),
  sendPublicationNotificationsForArtefact: vi.fn()
}));

vi.mock("./queries.js", () => ({
  findArtefactsDisplayedFromToday: vi.fn(),
  findScheduledListTypeArtefactsForToday: vi.fn()
}));

const NOW = new Date("2026-06-01T23:30:00.000Z");
const JSON_DATA = { courtLists: [] };

function buildArtefact(overrides = {}) {
  return {
    artefactId: "artefact-1",
    locationId: "123",
    listTypeId: 999,
    listTypeName: "MAGISTRATES_ADULT_COURT_LIST_DAILY",
    contentDate: new Date("2026-06-02T00:00:00.000Z"),
    language: "ENGLISH",
    isFlatFile: false,
    sensitivity: "PUBLIC",
    provenance: "MANUAL_UPLOAD",
    displayFrom: new Date("2026-06-01T23:00:00.000Z"),
    displayTo: null,
    ...overrides
  };
}

describe("subscription schedule service", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getPublicationJson).mockResolvedValue(JSON_DATA);
    vi.mocked(sendPublicationNotificationsForArtefact).mockResolvedValue({ success: true });
    vi.mocked(pushPublicationToThirdParties).mockResolvedValue("sent");
  });

  describe("triggerDisplayFromSubscriptions", () => {
    function buildDisplayFromArtefact(overrides = {}) {
      return buildArtefact({ listTypeName: "CIVIL_DAILY_CAUSE_LIST", ...overrides });
    }

    it("should email each artefact with the loaded JSON and the PDF blob key", async () => {
      // Arrange
      const artefact = buildDisplayFromArtefact();
      vi.mocked(findArtefactsDisplayedFromToday).mockResolvedValue([artefact]);

      // Act
      const result = await triggerDisplayFromSubscriptions(NOW);

      // Assert
      expect(getPublicationJson).toHaveBeenCalledWith("artefact-1");
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledWith({
        artefactId: "artefact-1",
        locationId: "123",
        listTypeId: 999,
        contentDate: artefact.contentDate,
        jsonData: JSON_DATA,
        pdfFilePath: "artefact-1.pdf",
        locale: "en",
        logPrefix: "[SubscriptionSchedule]"
      });
      expect(result.email).toEqual({ total: 1, succeeded: 1, failed: 0 });
    });

    it("should push each artefact to third parties as a new publication", async () => {
      // Arrange
      const artefact = buildDisplayFromArtefact();
      vi.mocked(findArtefactsDisplayedFromToday).mockResolvedValue([artefact]);

      // Act
      const result = await triggerDisplayFromSubscriptions(NOW);

      // Assert
      expect(pushPublicationToThirdParties).toHaveBeenCalledWith({
        artefactId: "artefact-1",
        locationId: "123",
        listTypeId: 999,
        contentDate: artefact.contentDate,
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: artefact.displayFrom,
        displayTo: null,
        provenance: "MANUAL_UPLOAD",
        isUpdate: false,
        jsonData: JSON_DATA,
        pdfBlobName: "artefact-1.pdf",
        logPrefix: "[SubscriptionSchedule]"
      });
      expect(result.thirdParty).toEqual({ total: 1, sent: 1, skipped: 0, failed: 0 });
    });

    it("should push scheduled list types to third parties without emailing them", async () => {
      // Arrange
      vi.mocked(findArtefactsDisplayedFromToday).mockResolvedValue([buildArtefact({ listTypeName: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY" })]);

      // Act
      const result = await triggerDisplayFromSubscriptions(NOW);

      // Assert
      expect(sendPublicationNotificationsForArtefact).not.toHaveBeenCalled();
      expect(pushPublicationToThirdParties).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "artefact-1" }));
      expect(result).toEqual({
        email: { total: 0, succeeded: 0, failed: 0 },
        thirdParty: { total: 1, sent: 1, skipped: 0, failed: 0 }
      });
    });

    it("should use the Welsh locale for Welsh publications", async () => {
      // Arrange
      vi.mocked(findArtefactsDisplayedFromToday).mockResolvedValue([buildDisplayFromArtefact({ language: "WELSH" })]);

      // Act
      await triggerDisplayFromSubscriptions(NOW);

      // Assert
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledWith(expect.objectContaining({ locale: "cy" }));
    });

    it("should not load JSON for flat files", async () => {
      // Arrange
      vi.mocked(findArtefactsDisplayedFromToday).mockResolvedValue([buildDisplayFromArtefact({ isFlatFile: true })]);

      // Act
      const result = await triggerDisplayFromSubscriptions(NOW);

      // Assert
      expect(getPublicationJson).not.toHaveBeenCalled();
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledWith(expect.objectContaining({ jsonData: undefined }));
      expect(pushPublicationToThirdParties).toHaveBeenCalledWith(expect.objectContaining({ jsonData: undefined }));
      expect(result.email).toEqual({ total: 1, succeeded: 1, failed: 0 });
    });

    it("should continue past failed emails and report the summary", async () => {
      // Arrange
      vi.mocked(findArtefactsDisplayedFromToday).mockResolvedValue([
        buildDisplayFromArtefact({ artefactId: "first" }),
        buildDisplayFromArtefact({ artefactId: "second" }),
        buildDisplayFromArtefact({ artefactId: "third" })
      ]);
      vi.mocked(sendPublicationNotificationsForArtefact).mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });
      vi.mocked(getPublicationJson).mockResolvedValueOnce(JSON_DATA).mockResolvedValueOnce(JSON_DATA).mockRejectedValueOnce(new Error("Blob unparseable"));

      // Act
      const result = await triggerDisplayFromSubscriptions(NOW);

      // Assert
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledTimes(2);
      expect(result.email).toEqual({ total: 3, succeeded: 1, failed: 2 });
      expect(consoleErrorSpy).toHaveBeenCalledWith("[SubscriptionSchedule] Failed to trigger subscriptions for artefact:", {
        artefactId: "second",
        listTypeName: "CIVIL_DAILY_CAUSE_LIST",
        error: "Subscription notifications were not sent"
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith("[SubscriptionSchedule] Failed to trigger subscriptions for artefact:", {
        artefactId: "third",
        listTypeName: "CIVIL_DAILY_CAUSE_LIST",
        error: "Blob unparseable"
      });
    });

    it("should still push to third parties when an artefact's email fails", async () => {
      // Arrange
      vi.mocked(findArtefactsDisplayedFromToday).mockResolvedValue([buildDisplayFromArtefact()]);
      vi.mocked(sendPublicationNotificationsForArtefact).mockResolvedValue({ success: false });

      // Act
      const result = await triggerDisplayFromSubscriptions(NOW);

      // Assert
      expect(pushPublicationToThirdParties).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        email: { total: 1, succeeded: 0, failed: 1 },
        thirdParty: { total: 1, sent: 1, skipped: 0, failed: 0 }
      });
    });

    it("should count each third-party outcome and continue past a rejected push", async () => {
      // Arrange
      vi.mocked(findArtefactsDisplayedFromToday).mockResolvedValue([
        buildDisplayFromArtefact({ artefactId: "first" }),
        buildDisplayFromArtefact({ artefactId: "second" }),
        buildDisplayFromArtefact({ artefactId: "third" }),
        buildDisplayFromArtefact({ artefactId: "fourth" })
      ]);
      vi.mocked(pushPublicationToThirdParties)
        .mockResolvedValueOnce("sent")
        .mockResolvedValueOnce("skipped")
        .mockResolvedValueOnce("failed")
        .mockRejectedValueOnce(new Error("Blob unavailable"));

      // Act
      const result = await triggerDisplayFromSubscriptions(NOW);

      // Assert
      expect(pushPublicationToThirdParties).toHaveBeenCalledTimes(4);
      expect(result.thirdParty).toEqual({ total: 4, sent: 1, skipped: 1, failed: 2 });
      expect(consoleErrorSpy).toHaveBeenCalledWith("[SubscriptionSchedule] Failed to push artefact to third parties:", {
        artefactId: "fourth",
        listTypeName: "CIVIL_DAILY_CAUSE_LIST",
        error: "Blob unavailable"
      });
    });

    it("should count an artefact as failed on both channels when its JSON is missing", async () => {
      // Arrange
      vi.mocked(findArtefactsDisplayedFromToday).mockResolvedValue([buildDisplayFromArtefact()]);
      vi.mocked(getPublicationJson).mockResolvedValue(null);

      // Act
      const result = await triggerDisplayFromSubscriptions(NOW);

      // Assert
      expect(sendPublicationNotificationsForArtefact).not.toHaveBeenCalled();
      expect(pushPublicationToThirdParties).not.toHaveBeenCalled();
      expect(result).toEqual({
        email: { total: 1, succeeded: 0, failed: 1 },
        thirdParty: { total: 1, sent: 0, skipped: 0, failed: 1 }
      });
    });

    it("should log a non-Error rejection as a string", async () => {
      // Arrange
      vi.mocked(findArtefactsDisplayedFromToday).mockResolvedValue([buildDisplayFromArtefact()]);
      vi.mocked(getPublicationJson).mockRejectedValue("boom");

      // Act
      await triggerDisplayFromSubscriptions(NOW);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ error: "boom" }));
    });

    it("should pass the London day derived from the injected time to the query", async () => {
      // Arrange
      vi.mocked(findArtefactsDisplayedFromToday).mockResolvedValue([]);

      // Act
      const result = await triggerDisplayFromSubscriptions(NOW);

      // Assert
      expect(findArtefactsDisplayedFromToday).toHaveBeenCalledWith(
        {
          start: new Date("2026-06-01T23:00:00.000Z"),
          end: new Date("2026-06-02T23:00:00.000Z"),
          contentDate: new Date("2026-06-02T00:00:00.000Z")
        },
        NOW
      );
      expect(result).toEqual({
        email: { total: 0, succeeded: 0, failed: 0 },
        thirdParty: { total: 0, sent: 0, skipped: 0, failed: 0 }
      });
    });
  });

  describe("triggerScheduledListTypeSubscriptions", () => {
    it("should email each scheduled list type artefact", async () => {
      // Arrange
      vi.mocked(findScheduledListTypeArtefactsForToday).mockResolvedValue([
        buildArtefact({ artefactId: "daily" }),
        buildArtefact({ artefactId: "public-daily", listTypeName: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY" })
      ]);

      // Act
      const result = await triggerScheduledListTypeSubscriptions(NOW);

      // Assert
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "daily", pdfFilePath: "daily.pdf" }));
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledWith(
        expect.objectContaining({ artefactId: "public-daily", pdfFilePath: "public-daily.pdf" })
      );
      expect(result).toEqual({ total: 2, succeeded: 2, failed: 0 });
    });

    it("should still email the other artefacts when JSON loading fails for one", async () => {
      // Arrange
      vi.mocked(findScheduledListTypeArtefactsForToday).mockResolvedValue([buildArtefact({ artefactId: "broken" }), buildArtefact({ artefactId: "ok" })]);
      vi.mocked(getPublicationJson).mockRejectedValueOnce(new Error("Blob missing")).mockResolvedValueOnce(JSON_DATA);

      // Act
      const result = await triggerScheduledListTypeSubscriptions(NOW);

      // Assert
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledTimes(1);
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "ok" }));
      expect(result).toEqual({ total: 2, succeeded: 1, failed: 1 });
    });

    it("should reject and send nothing when the query fails", async () => {
      // Arrange
      vi.mocked(findScheduledListTypeArtefactsForToday).mockRejectedValue(new Error("Database unavailable"));

      // Act
      const result = triggerScheduledListTypeSubscriptions(NOW);

      // Assert
      await expect(result).rejects.toThrow("Database unavailable");
      expect(sendPublicationNotificationsForArtefact).not.toHaveBeenCalled();
    });

    it("should pass the London day derived from the injected time to the query", async () => {
      // Arrange
      vi.mocked(findScheduledListTypeArtefactsForToday).mockResolvedValue([]);

      // Act
      await triggerScheduledListTypeSubscriptions(NOW);

      // Assert
      expect(findScheduledListTypeArtefactsForToday).toHaveBeenCalledWith(expect.objectContaining({ contentDate: new Date("2026-06-02T00:00:00.000Z") }), NOW);
    });

    it("should default to the current time when no time is injected", async () => {
      // Arrange
      vi.mocked(findScheduledListTypeArtefactsForToday).mockResolvedValue([]);

      // Act
      await triggerScheduledListTypeSubscriptions();

      // Assert
      expect(findScheduledListTypeArtefactsForToday).toHaveBeenCalledWith(expect.any(Object), expect.any(Date));
    });
  });
});
