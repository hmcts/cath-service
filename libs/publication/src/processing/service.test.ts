import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePublicationPdf, processPublicationAfterSave, sendPublicationNotificationsForArtefact } from "./service.js";

vi.mock("@hmcts/civil-and-family-daily-cause-list", () => ({
  generateCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

vi.mock("@hmcts/notifications", () => ({
  sendPublicationNotifications: vi.fn()
}));

vi.mock("../index.js", () => ({
  mockListTypes: [
    { id: 1, englishFriendlyName: "Daily Cause List" },
    { id: 8, englishFriendlyName: "Civil And Family Daily Cause List" }
  ]
}));

describe("publication-processor", async () => {
  const { generateCauseListPdf } = await import("@hmcts/civil-and-family-daily-cause-list");
  const { getLocationById } = await import("@hmcts/location");
  const { sendPublicationNotifications } = await import("@hmcts/notifications");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generatePublicationPdf", () => {
    const baseParams = {
      artefactId: "test-artefact-id",
      listTypeId: 8,
      contentDate: new Date("2025-01-25"),
      locale: "en",
      locationId: "123",
      jsonData: { courtLists: [] } as any,
      provenance: "MANUAL_UPLOAD"
    };

    it("should return empty result for non-Civil and Family list types", async () => {
      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 1 });

      expect(result).toEqual({});
      expect(generateCauseListPdf).not.toHaveBeenCalled();
    });

    it("should generate PDF for Civil and Family Daily Cause List", async () => {
      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf(baseParams);

      expect(generateCauseListPdf).toHaveBeenCalledWith({
        artefactId: "test-artefact-id",
        contentDate: baseParams.contentDate,
        locale: "en",
        locationId: "123",
        jsonData: baseParams.jsonData,
        provenance: "MANUAL_UPLOAD"
      });
      expect(result).toEqual({
        pdfPath: "/path/to/pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });
    });

    it("should return empty result when PDF generation fails", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: false,
        error: "Generation failed"
      });

      const result = await generatePublicationPdf(baseParams);

      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith("[Publication] PDF generation failed:", {
        artefactId: "test-artefact-id",
        error: "Generation failed"
      });

      consoleWarnSpy.mockRestore();
    });

    it("should handle exceptions during PDF generation", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(generateCauseListPdf).mockRejectedValue(new Error("Unexpected error"));

      const result = await generatePublicationPdf(baseParams);

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] PDF generation error:", {
        artefactId: "test-artefact-id",
        error: "Unexpected error"
      });

      consoleErrorSpy.mockRestore();
    });

    it("should use custom log prefix", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: false,
        error: "Failed"
      });

      await generatePublicationPdf({ ...baseParams, logPrefix: "[Custom]" });

      expect(consoleWarnSpy).toHaveBeenCalledWith("[Custom] PDF generation failed:", expect.any(Object));

      consoleWarnSpy.mockRestore();
    });
  });

  describe("sendPublicationNotificationsForArtefact", () => {
    const baseParams = {
      artefactId: "test-artefact-id",
      locationId: "123",
      listTypeId: 8,
      contentDate: new Date("2025-01-25"),
      jsonData: { courtLists: [] },
      pdfFilePath: "/path/to/pdf"
    };

    it("should return failure for invalid location ID", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await sendPublicationNotificationsForArtefact({
        ...baseParams,
        locationId: "invalid"
      });

      expect(result).toEqual({ success: false });
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Invalid location ID for notifications:", "invalid");
      expect(sendPublicationNotifications).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should return failure when location not found", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.mocked(getLocationById).mockResolvedValue(null);

      const result = await sendPublicationNotificationsForArtefact(baseParams);

      expect(result).toEqual({ success: false });
      expect(consoleWarnSpy).toHaveBeenCalledWith("[Publication] Location not found for notifications:", {
        locationId: "123"
      });
      expect(sendPublicationNotifications).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("should send notifications successfully", async () => {
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendPublicationNotifications).mockResolvedValue({
        totalSubscriptions: 10,
        sent: 8,
        failed: 2,
        skipped: 0,
        errors: []
      });

      const result = await sendPublicationNotificationsForArtefact(baseParams);

      expect(sendPublicationNotifications).toHaveBeenCalledWith({
        publicationId: "test-artefact-id",
        locationId: "123",
        locationName: "Test Court",
        hearingListName: "Civil And Family Daily Cause List",
        publicationDate: baseParams.contentDate,
        listTypeId: 8,
        jsonData: baseParams.jsonData,
        pdfFilePath: "/path/to/pdf"
      });
      expect(result).toEqual({
        success: true,
        totalSubscriptions: 10,
        sent: 8,
        failed: 2,
        skipped: 0
      });
    });

    it("should use fallback list type name when not found", async () => {
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendPublicationNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: []
      });

      await sendPublicationNotificationsForArtefact({ ...baseParams, listTypeId: 999 });

      expect(sendPublicationNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          hearingListName: "LIST_TYPE_999"
        })
      );
    });

    it("should log notification errors with redacted emails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendPublicationNotifications).mockResolvedValue({
        totalSubscriptions: 2,
        sent: 0,
        failed: 2,
        skipped: 0,
        errors: [{ email: "user@example.com", error: "Invalid email" }, "Failed for test@domain.org"]
      });

      const result = await sendPublicationNotificationsForArtefact(baseParams);

      expect(result.success).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Notification errors:", {
        count: 2,
        errors: ['{"email":"[REDACTED_EMAIL]","error":"Invalid email"}', "Failed for [REDACTED_EMAIL]"]
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle notification service errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendPublicationNotifications).mockRejectedValue(new Error("Service unavailable"));

      const result = await sendPublicationNotificationsForArtefact(baseParams);

      expect(result).toEqual({ success: false });
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Failed to send notifications:", {
        artefactId: "test-artefact-id",
        error: "Service unavailable"
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("processPublicationAfterSave", () => {
    const baseParams = {
      artefactId: "test-artefact-id",
      locationId: "123",
      listTypeId: 8,
      contentDate: new Date("2025-01-25"),
      locale: "en",
      jsonData: { courtLists: [] } as any,
      provenance: "MANUAL_UPLOAD"
    };

    it("should generate PDF and send notifications", async () => {
      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/pdf",
        sizeBytes: 2048,
        exceedsMaxSize: false
      });
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendPublicationNotifications).mockResolvedValue({
        totalSubscriptions: 5,
        sent: 5,
        failed: 0,
        skipped: 0,
        errors: []
      });

      const result = await processPublicationAfterSave(baseParams);

      expect(result).toEqual({
        pdfPath: "/path/to/pdf",
        pdfSizeBytes: 2048,
        pdfExceedsMaxSize: false,
        notificationsSent: 5,
        notificationsFailed: 0
      });
    });

    it("should skip PDF generation when jsonData is not provided", async () => {
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendPublicationNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: []
      });

      const result = await processPublicationAfterSave({
        ...baseParams,
        jsonData: undefined
      });

      expect(generateCauseListPdf).not.toHaveBeenCalled();
      expect(result.pdfPath).toBeUndefined();
    });

    it("should skip notifications when skipNotifications is true", async () => {
      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await processPublicationAfterSave({
        ...baseParams,
        skipNotifications: true
      });

      expect(sendPublicationNotifications).not.toHaveBeenCalled();
      expect(result.notificationsSent).toBeUndefined();
      expect(result.pdfPath).toBe("/path/to/pdf");
    });

    it("should pass PDF path to notifications", async () => {
      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/generated/pdf/path",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendPublicationNotifications).mockResolvedValue({
        totalSubscriptions: 1,
        sent: 1,
        failed: 0,
        skipped: 0,
        errors: []
      });

      await processPublicationAfterSave(baseParams);

      expect(sendPublicationNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          pdfFilePath: "/generated/pdf/path"
        })
      );
    });
  });
});
