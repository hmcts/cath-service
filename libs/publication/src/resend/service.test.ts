import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtefactWithListType } from "../repository/model.js";

vi.mock("@hmcts/legacy-third-party-fulfilment", () => ({ sendThirdPartyPublications: vi.fn() }));
vi.mock("@hmcts/third-party-subscription-fulfilment", () => ({ sendPublicationToThirdParties: vi.fn() }));
vi.mock("../file-storage/file-retrieval.js", () => ({ getPublicationJson: vi.fn() }));
vi.mock("../processing/service.js", () => ({ sendPublicationNotificationsForArtefact: vi.fn() }));
vi.mock("../repository/queries.js", () => ({ getArtefactById: vi.fn() }));

const { sendThirdPartyPublications } = await import("@hmcts/legacy-third-party-fulfilment");
const { sendPublicationToThirdParties } = await import("@hmcts/third-party-subscription-fulfilment");
const { getPublicationJson } = await import("../file-storage/file-retrieval.js");
const { sendPublicationNotificationsForArtefact } = await import("../processing/service.js");
const { getArtefactById } = await import("../repository/queries.js");
const { resendPublication } = await import("./service.js");

const ARTEFACT_ID = "artefact-123";
const JSON_DATA = { courtLists: [] };

function buildArtefact(overrides: Partial<ArtefactWithListType> = {}): ArtefactWithListType {
  return {
    artefactId: ARTEFACT_ID,
    type: "LIST",
    locationId: "9001",
    listTypeId: 999,
    listTypeName: "CIVIL_DAILY_CAUSE_LIST",
    contentDate: new Date("2026-11-20T00:00:00Z"),
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    displayFrom: new Date("2026-11-20T00:00:00Z"),
    displayTo: new Date("2026-11-21T00:00:00Z"),
    lastReceivedDate: new Date("2026-11-20T00:00:00Z"),
    isFlatFile: false,
    provenance: "MANUAL_UPLOAD",
    ...overrides
  };
}

describe("resendPublication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(getArtefactById).mockResolvedValue(buildArtefact());
    vi.mocked(getPublicationJson).mockResolvedValue(JSON_DATA);
    vi.mocked(sendThirdPartyPublications).mockResolvedValue("sent");
    vi.mocked(sendPublicationToThirdParties).mockResolvedValue("sent");
    vi.mocked(sendPublicationNotificationsForArtefact).mockResolvedValue({ success: true, totalSubscriptions: 2, sent: 2, failed: 0, skipped: 0 });
  });

  describe("channel selection", () => {
    it("should send only to Courtel as a new publication with a single attempt", async () => {
      // Act
      const result = await resendPublication(ARTEFACT_ID, "courtel");

      // Assert
      expect(result).toEqual({ status: "sent", channels: { courtel: "sent" } });
      expect(sendThirdPartyPublications).toHaveBeenCalledWith(
        expect.objectContaining({
          artefactId: ARTEFACT_ID,
          locationId: "9001",
          listTypeId: 999,
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          provenance: "MANUAL_UPLOAD",
          isUpdate: false,
          maxAttempts: 1,
          jsonData: JSON_DATA
        })
      );
      const [params] = vi.mocked(sendThirdPartyPublications).mock.calls[0];
      expect(params.pdfPath).toBeUndefined();
      expect(params.flatFilePath).toBeUndefined();
      expect(sendPublicationToThirdParties).not.toHaveBeenCalled();
      expect(sendPublicationNotificationsForArtefact).not.toHaveBeenCalled();
    });

    it("should send only to third parties with PUT and the display window ignored", async () => {
      // Act
      const result = await resendPublication(ARTEFACT_ID, "third-party");

      // Assert
      expect(result).toEqual({ status: "sent", channels: { "third-party": "sent" } });
      expect(sendPublicationToThirdParties).toHaveBeenCalledWith(
        expect.objectContaining({ artefactId: ARTEFACT_ID, isUpdate: true, ignoreDisplayWindow: true, jsonData: JSON_DATA })
      );
      expect(sendThirdPartyPublications).not.toHaveBeenCalled();
      expect(sendPublicationNotificationsForArtefact).not.toHaveBeenCalled();
    });

    it("should send only subscription emails with the PDF key and an English locale", async () => {
      // Act
      const result = await resendPublication(ARTEFACT_ID, "email");

      // Assert
      expect(result).toEqual({ status: "sent", channels: { email: "sent" }, emailCounts: { sent: 2, failed: 0 } });
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledWith(
        expect.objectContaining({
          artefactId: ARTEFACT_ID,
          locationId: "9001",
          listTypeId: 999,
          jsonData: JSON_DATA,
          pdfFilePath: `${ARTEFACT_ID}.pdf`,
          locale: "en"
        })
      );
      expect(sendThirdPartyPublications).not.toHaveBeenCalled();
      expect(sendPublicationToThirdParties).not.toHaveBeenCalled();
    });

    it("should use the Welsh locale for a Welsh publication", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue(buildArtefact({ language: "WELSH" }));

      // Act
      await resendPublication(ARTEFACT_ID, "email");

      // Assert
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledWith(expect.objectContaining({ locale: "cy" }));
    });

    it("should send to every channel on re-submit", async () => {
      // Act
      const result = await resendPublication(ARTEFACT_ID, "resubmit");

      // Assert
      expect(result).toEqual({
        status: "sent",
        channels: { courtel: "sent", "third-party": "sent", email: "sent" },
        emailCounts: { sent: 2, failed: 0 }
      });
      expect(sendThirdPartyPublications).toHaveBeenCalledTimes(1);
      expect(sendPublicationToThirdParties).toHaveBeenCalledTimes(1);
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledTimes(1);
    });
  });

  describe("outcomes", () => {
    it("should return not-found and send nothing when the artefact is missing", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue(null);

      // Act
      const result = await resendPublication(ARTEFACT_ID, "resubmit");

      // Assert
      expect(result).toEqual({ status: "not-found" });
      expect(sendThirdPartyPublications).not.toHaveBeenCalled();
      expect(sendPublicationToThirdParties).not.toHaveBeenCalled();
      expect(sendPublicationNotificationsForArtefact).not.toHaveBeenCalled();
    });

    it("should still call the other channels and return failed when one re-submit channel rejects", async () => {
      // Arrange
      vi.mocked(sendThirdPartyPublications).mockRejectedValue(new Error("Courtel unreachable"));

      // Act
      const result = await resendPublication(ARTEFACT_ID, "resubmit");

      // Assert
      expect(result).toEqual({
        status: "failed",
        channels: { courtel: "failed", "third-party": "sent", email: "sent" },
        emailCounts: { sent: 2, failed: 0 }
      });
      expect(sendPublicationToThirdParties).toHaveBeenCalledTimes(1);
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledTimes(1);
    });

    it("should return failed on re-submit when a channel reports failure", async () => {
      // Arrange
      vi.mocked(sendPublicationToThirdParties).mockResolvedValue("failed");

      // Act
      const result = await resendPublication(ARTEFACT_ID, "resubmit");

      // Assert
      expect(result.status).toBe("failed");
    });

    it("should return no-recipients when every re-submit channel has no recipients", async () => {
      // Arrange
      vi.mocked(sendThirdPartyPublications).mockResolvedValue("no-recipients");
      vi.mocked(sendPublicationToThirdParties).mockResolvedValue("no-recipients");
      vi.mocked(sendPublicationNotificationsForArtefact).mockResolvedValue({ success: true, totalSubscriptions: 0, sent: 0, failed: 0, skipped: 0 });

      // Act
      const result = await resendPublication(ARTEFACT_ID, "resubmit");

      // Assert
      expect(result).toEqual({
        status: "no-recipients",
        channels: { courtel: "no-recipients", "third-party": "no-recipients", email: "no-recipients" },
        emailCounts: { sent: 0, failed: 0 }
      });
    });

    it("should return sent on re-submit when some channels have no recipients and the rest send", async () => {
      // Arrange
      vi.mocked(sendThirdPartyPublications).mockResolvedValue("no-recipients");

      // Act
      const result = await resendPublication(ARTEFACT_ID, "resubmit");

      // Assert
      expect(result.status).toBe("sent");
    });

    it("should return no-recipients for Courtel when it is not subscribed", async () => {
      // Arrange
      vi.mocked(sendThirdPartyPublications).mockResolvedValue("no-recipients");

      // Act
      const result = await resendPublication(ARTEFACT_ID, "courtel");

      // Assert
      expect(result).toEqual({ status: "no-recipients", channels: { courtel: "no-recipients" } });
    });

    it("should return failed for a single channel that throws", async () => {
      // Arrange
      vi.mocked(sendPublicationToThirdParties).mockRejectedValue("boom");

      // Act
      const result = await resendPublication(ARTEFACT_ID, "third-party");

      // Assert
      expect(result).toEqual({ status: "failed", channels: { "third-party": "failed" } });
    });

    it.each([
      ["the notification call fails", { success: false }, "failed"],
      ["no one is subscribed", { success: true, totalSubscriptions: 0, sent: 0, failed: 0, skipped: 0 }, "no-recipients"],
      ["every email fails", { success: true, totalSubscriptions: 2, sent: 0, failed: 2, skipped: 0 }, "failed"],
      ["every subscriber is skipped", { success: true, totalSubscriptions: 2, sent: 0, failed: 0, skipped: 2 }, "no-recipients"],
      ["some subscribers are skipped and the rest fail", { success: true, totalSubscriptions: 2, sent: 0, failed: 1, skipped: 1 }, "failed"],
      ["some emails send and some fail", { success: true, totalSubscriptions: 2, sent: 1, failed: 1, skipped: 0 }, "sent"]
    ])("should map the email result when %s", async (_label, notificationResult, expected) => {
      // Arrange
      vi.mocked(sendPublicationNotificationsForArtefact).mockResolvedValue(notificationResult);

      // Act
      const result = await resendPublication(ARTEFACT_ID, "email");

      // Assert
      expect(result.status).toBe(expected);
    });

    it("should record the email sent and failed counts for a partial failure", async () => {
      // Arrange
      vi.mocked(sendPublicationNotificationsForArtefact).mockResolvedValue({ success: true, totalSubscriptions: 3, sent: 2, failed: 1, skipped: 0 });

      // Act
      const result = await resendPublication(ARTEFACT_ID, "email");

      // Assert
      expect(result).toEqual({ status: "sent", channels: { email: "sent" }, emailCounts: { sent: 2, failed: 1 } });
    });

    it("should omit email counts when the notification call fails outright", async () => {
      // Arrange
      vi.mocked(sendPublicationNotificationsForArtefact).mockResolvedValue({ success: false });

      // Act
      const result = await resendPublication(ARTEFACT_ID, "email");

      // Assert
      expect(result).toEqual({ status: "failed", channels: { email: "failed" } });
    });

    it("should still send a publication that is outside its display window", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue(
        buildArtefact({ displayFrom: new Date("2020-01-01T00:00:00Z"), displayTo: new Date("2020-01-02T00:00:00Z") })
      );

      // Act
      const result = await resendPublication(ARTEFACT_ID, "resubmit");

      // Assert
      expect(result.status).toBe("sent");
      expect(sendThirdPartyPublications).toHaveBeenCalledTimes(1);
      expect(sendPublicationToThirdParties).toHaveBeenCalledWith(expect.objectContaining({ ignoreDisplayWindow: true }));
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledTimes(1);
    });
  });

  describe("JSON payload", () => {
    it("should not load JSON for a flat file", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue(buildArtefact({ isFlatFile: true }));

      // Act
      await resendPublication(ARTEFACT_ID, "third-party");

      // Assert
      expect(getPublicationJson).not.toHaveBeenCalled();
      expect(sendPublicationToThirdParties).toHaveBeenCalledWith(expect.objectContaining({ jsonData: undefined }));
    });

    it("should carry on without JSON when the payload is missing", async () => {
      // Arrange
      vi.mocked(getPublicationJson).mockResolvedValue(null);

      // Act
      const result = await resendPublication(ARTEFACT_ID, "email");

      // Assert
      expect(result.status).toBe("sent");
      expect(sendPublicationNotificationsForArtefact).toHaveBeenCalledWith(expect.objectContaining({ jsonData: undefined }));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("JSON payload not found"), { artefactId: ARTEFACT_ID });
    });

    it("should carry on without JSON when the payload cannot be read", async () => {
      // Arrange
      vi.mocked(getPublicationJson).mockRejectedValue(new Error("bad json"));

      // Act
      await resendPublication(ARTEFACT_ID, "courtel");

      // Assert
      expect(sendThirdPartyPublications).toHaveBeenCalledWith(expect.objectContaining({ jsonData: undefined }));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Could not load JSON payload"), {
        artefactId: ARTEFACT_ID,
        error: "bad json"
      });
    });
  });
});
