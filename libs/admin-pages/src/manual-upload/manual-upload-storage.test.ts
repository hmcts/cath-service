import { describe, it, expect, vi, beforeEach } from "vitest";
import { getManualUpload, storeManualUpload } from "./manual-upload-storage.js";

const mockRedisClient = {
  setEx: vi.fn(),
  get: vi.fn()
};

vi.mock("@hmcts/redis", () => ({
  getRedisClient: vi.fn().mockResolvedValue(mockRedisClient)
}));

vi.mock("node:crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("test-uuid-123")
}));

describe("manual-upload-storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("storeManualUpload", () => {
    it("should store upload data in Redis with 1 hour TTL", async () => {
      const testData = {
        file: Buffer.from("test file content"),
        fileName: "test.pdf",
        fileType: "application/pdf",
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "03", year: "2024" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "15", month: "03", year: "2024" },
        displayTo: { day: "16", month: "03", year: "2024" }
      };

      mockRedisClient.setEx.mockResolvedValue("OK");

      const uploadId = await storeManualUpload(testData);

      expect(uploadId).toBe("test-uuid-123");
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        "manual-upload:test-uuid-123",
        3600,
        expect.any(String)
      );

      const storedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(storedData.fileName).toBe("test.pdf");
      expect(storedData.fileType).toBe("application/pdf");
      expect(storedData.fileBase64).toBe(Buffer.from("test file content").toString("base64"));
      expect(storedData.locationId).toBe("123");
      expect(storedData.listType).toBe("CIVIL_DAILY_CAUSE_LIST");
      expect(storedData.uploadedAt).toBeDefined();
    });

    it("should store file as base64 encoded string", async () => {
      const testData = {
        file: Buffer.from("binary data"),
        fileName: "document.pdf",
        fileType: "application/pdf",
        locationId: "456",
        listType: "FAMILY_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "20", month: "04", year: "2024" },
        sensitivity: "PRIVATE",
        language: "WELSH",
        displayFrom: { day: "20", month: "04", year: "2024" },
        displayTo: { day: "21", month: "04", year: "2024" }
      };

      mockRedisClient.setEx.mockResolvedValue("OK");

      await storeManualUpload(testData);

      const storedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(storedData.fileBase64).toBe("YmluYXJ5IGRhdGE=");
    });

    it("should store all date fields correctly", async () => {
      const testData = {
        file: Buffer.from("test"),
        fileName: "test.pdf",
        fileType: "application/pdf",
        locationId: "789",
        listType: "CRIMINAL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "10", month: "05", year: "2024" },
        sensitivity: "CLASSIFIED",
        language: "BILINGUAL",
        displayFrom: { day: "09", month: "05", year: "2024" },
        displayTo: { day: "11", month: "05", year: "2024" }
      };

      mockRedisClient.setEx.mockResolvedValue("OK");

      await storeManualUpload(testData);

      const storedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
      expect(storedData.hearingStartDate).toEqual({ day: "10", month: "05", year: "2024" });
      expect(storedData.displayFrom).toEqual({ day: "09", month: "05", year: "2024" });
      expect(storedData.displayTo).toEqual({ day: "11", month: "05", year: "2024" });
    });
  });

  describe("getManualUpload", () => {
    it("should retrieve and decode upload data from Redis", async () => {
      const storedData = {
        fileName: "retrieved.pdf",
        fileType: "application/pdf",
        fileBase64: Buffer.from("test content").toString("base64"),
        locationId: "999",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "25", month: "06", year: "2024" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "25", month: "06", year: "2024" },
        displayTo: { day: "26", month: "06", year: "2024" },
        uploadedAt: new Date().toISOString()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(storedData));

      const result = await getManualUpload("test-uuid-123");

      expect(mockRedisClient.get).toHaveBeenCalledWith("manual-upload:test-uuid-123");
      expect(result).toBeDefined();
      expect(result?.fileName).toBe("retrieved.pdf");
      expect(result?.fileType).toBe("application/pdf");
      expect(result?.file).toEqual(Buffer.from("test content"));
      expect(result?.locationId).toBe("999");
      expect(result?.listType).toBe("CIVIL_DAILY_CAUSE_LIST");
    });

    it("should return null for missing upload", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await getManualUpload("non-existent-id");

      expect(mockRedisClient.get).toHaveBeenCalledWith("manual-upload:non-existent-id");
      expect(result).toBeNull();
    });

    it("should correctly decode base64 file data", async () => {
      const originalContent = "Original file content with special chars: éàü";
      const storedData = {
        fileName: "test.pdf",
        fileType: "application/pdf",
        fileBase64: Buffer.from(originalContent).toString("base64"),
        locationId: "111",
        listType: "FAMILY_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "01", month: "01", year: "2024" },
        sensitivity: "PRIVATE",
        language: "WELSH",
        displayFrom: { day: "01", month: "01", year: "2024" },
        displayTo: { day: "02", month: "01", year: "2024" },
        uploadedAt: new Date().toISOString()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(storedData));

      const result = await getManualUpload("test-id");

      expect(result?.file.toString()).toBe(originalContent);
    });
  });
});
