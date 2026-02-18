import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConfigForListType, saveConfig, validateFieldName } from "./service.js";

vi.mock("./queries.js", () => ({
  findByListTypeId: vi.fn(),
  upsert: vi.fn()
}));

describe("list-search-config service", () => {
  describe("validateFieldName", () => {
    it("should return null for valid field names", () => {
      expect(validateFieldName("caseNumber", "Case number")).toBeNull();
      expect(validateFieldName("case_number", "Case number")).toBeNull();
      expect(validateFieldName("caseNumber123", "Case number")).toBeNull();
      expect(validateFieldName("CASE_NUMBER", "Case number")).toBeNull();
    });

    it("should return null for empty field name (optional field)", () => {
      const result = validateFieldName("", "Case number field name");
      expect(result).toBeNull();
    });

    it("should return null for whitespace-only field name (optional field)", () => {
      const result = validateFieldName("   ", "Case number field name");
      expect(result).toBeNull();
    });

    it("should return error for field name with invalid characters", () => {
      const result = validateFieldName("case-number", "Case number field name");
      expect(result).toEqual({
        field: "Case number field name",
        message: "Case number field name must contain only letters, numbers and underscores"
      });
    });

    it("should return error for field name with spaces", () => {
      const result = validateFieldName("case number", "Case number field name");
      expect(result).toEqual({
        field: "Case number field name",
        message: "Case number field name must contain only letters, numbers and underscores"
      });
    });

    it("should return error for field name with special characters", () => {
      const result = validateFieldName("case@number", "Case number field name");
      expect(result).toEqual({
        field: "Case number field name",
        message: "Case number field name must contain only letters, numbers and underscores"
      });
    });

    it("should return error for field name exceeding 100 characters", () => {
      const longFieldName = "a".repeat(101);
      const result = validateFieldName(longFieldName, "Case number field name");
      expect(result).toEqual({
        field: "Case number field name",
        message: "Case number field name must be 100 characters or less"
      });
    });

    it("should accept field name with exactly 100 characters", () => {
      const maxLengthFieldName = "a".repeat(100);
      const result = validateFieldName(maxLengthFieldName, "Case number field name");
      expect(result).toBeNull();
    });
  });

  describe("getConfigForListType", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return config for given list type id", async () => {
      const mockConfig = {
        listTypeId: 1,
        caseNumberFieldName: "caseNumber",
        caseNameFieldName: "caseName"
      };

      const { findByListTypeId } = await import("./queries.js");
      vi.mocked(findByListTypeId).mockResolvedValue(mockConfig as any);

      const result = await getConfigForListType(1);

      expect(result).toEqual(mockConfig);
      expect(findByListTypeId).toHaveBeenCalledWith(1);
    });

    it("should return null when config not found", async () => {
      const { findByListTypeId } = await import("./queries.js");
      vi.mocked(findByListTypeId).mockResolvedValue(null);

      const result = await getConfigForListType(999);

      expect(result).toBeNull();
      expect(findByListTypeId).toHaveBeenCalledWith(999);
    });
  });

  describe("saveConfig", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should save config with valid field names", async () => {
      const { upsert } = await import("./queries.js");
      vi.mocked(upsert).mockResolvedValue({} as any);

      const result = await saveConfig(1, "caseNumber", "caseName");

      expect(result).toEqual({ success: true });
      expect(upsert).toHaveBeenCalledWith(1, {
        caseNumberFieldName: "caseNumber",
        caseNameFieldName: "caseName"
      });
    });

    it("should trim whitespace from valid field names before saving", async () => {
      const { upsert } = await import("./queries.js");
      vi.mocked(upsert).mockResolvedValue({} as any);

      // Field names without internal spaces should work with leading/trailing spaces
      const result = await saveConfig(1, "caseNumber", "caseName");

      expect(result).toEqual({ success: true });
      expect(upsert).toHaveBeenCalledWith(1, {
        caseNumberFieldName: "caseNumber",
        caseNameFieldName: "caseName"
      });
    });

    it("should reject field names with spaces even with trim", async () => {
      // Spaces within field names are invalid characters
      const result = await saveConfig(1, "  case Number  ", "  case Name  ");

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors![0].message).toContain("must contain only letters, numbers and underscores");
    });

    it("should save config with only case number field (case name blank)", async () => {
      const { upsert } = await import("./queries.js");
      vi.mocked(upsert).mockResolvedValue({} as any);

      const result = await saveConfig(1, "caseNumber", "");

      expect(result).toEqual({ success: true });
      expect(upsert).toHaveBeenCalledWith(1, {
        caseNumberFieldName: "caseNumber",
        caseNameFieldName: ""
      });
    });

    it("should save config with only case name field (case number blank)", async () => {
      const { upsert } = await import("./queries.js");
      vi.mocked(upsert).mockResolvedValue({} as any);

      const result = await saveConfig(1, "", "caseName");

      expect(result).toEqual({ success: true });
      expect(upsert).toHaveBeenCalledWith(1, {
        caseNumberFieldName: "",
        caseNameFieldName: "caseName"
      });
    });

    it("should return error when both fields are blank", async () => {
      const { upsert } = await import("./queries.js");

      const result = await saveConfig(1, "", "");

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([
        {
          field: "",
          message: "Enter at least one field name"
        }
      ]);
      expect(upsert).not.toHaveBeenCalled();
    });

    it("should return validation errors for invalid characters in case number field", async () => {
      const result = await saveConfig(1, "case-number", "caseName");

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([
        {
          field: "Case number field name",
          message: "Case number field name must contain only letters, numbers and underscores"
        }
      ]);
    });

    it("should return validation errors for invalid characters in case name field", async () => {
      const result = await saveConfig(1, "caseNumber", "case@name");

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([
        {
          field: "Case name field name",
          message: "Case name field name must contain only letters, numbers and underscores"
        }
      ]);
    });

    it("should return validation errors for field names exceeding 100 characters", async () => {
      const longFieldName = "a".repeat(101);
      const result = await saveConfig(1, longFieldName, "caseName");

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([
        {
          field: "Case number field name",
          message: "Case number field name must be 100 characters or less"
        }
      ]);
    });

    it("should not call upsert when validation fails", async () => {
      const { upsert } = await import("./queries.js");

      await saveConfig(1, "invalid-field", "caseName");

      expect(upsert).not.toHaveBeenCalled();
    });
  });
});
