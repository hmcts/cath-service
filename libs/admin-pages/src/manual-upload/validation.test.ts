import { describe, expect, it } from "vitest";
import { validateDate, validateForm } from "./validation.js";

const mockTranslations = {
  errorMessages: {
    fileRequired: "File is required",
    fileType: "Invalid file type",
    fileSize: "File too large, please upload file smaller than 2MB",
    courtRequired: "Court is required",
    courtTooShort: "Court name too short",
    listTypeRequired: "List type is required",
    sensitivityRequired: "Sensitivity is required",
    languageRequired: "Language is required",
    hearingStartDateRequired: "Hearing start date is required",
    hearingStartDateInvalid: "Hearing start date is invalid",
    displayFromRequired: "Display from date is required",
    displayFromInvalid: "Display from date is invalid",
    displayToRequired: "Display to date is required",
    displayToInvalid: "Display to date is invalid",
    displayToBeforeFrom: "Display to must be after display from"
  }
};

describe("validateDate", () => {
  describe("Valid dates", () => {
    it("should return null for a valid date", async () => {
      const result = validateDate({ day: "15", month: "06", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toBeNull();
    });

    it("should return null for a valid leap year date", async () => {
      const result = validateDate({ day: "29", month: "02", year: "2024" }, "testField", "Required message", "Invalid message");
      expect(result).toBeNull();
    });
  });

  describe("Missing date inputs", () => {
    it("should return error when date input is undefined", async () => {
      const result = validateDate(undefined, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Required message",
        href: "#testField"
      });
    });

    it("should return error when day is missing", async () => {
      const result = validateDate({ day: "", month: "06", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Required message",
        href: "#testField"
      });
    });

    it("should return error when month is missing", async () => {
      const result = validateDate({ day: "15", month: "", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Required message",
        href: "#testField"
      });
    });

    it("should return error when year is missing", async () => {
      const result = validateDate({ day: "15", month: "06", year: "" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Required message",
        href: "#testField"
      });
    });
  });

  describe("Invalid dates", () => {
    it("should return error for invalid day", async () => {
      const result = validateDate({ day: "32", month: "01", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Invalid message",
        href: "#testField"
      });
    });

    it("should return error for invalid month", async () => {
      const result = validateDate({ day: "15", month: "13", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Invalid message",
        href: "#testField"
      });
    });

    it("should return error for February 29 in non-leap year", async () => {
      const result = validateDate({ day: "29", month: "02", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Invalid message",
        href: "#testField"
      });
    });

    it("should return error for non-numeric values", async () => {
      const result = validateDate({ day: "abc", month: "06", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Invalid message",
        href: "#testField"
      });
    });
  });
});

describe("validateForm", () => {
  const createMockFile = (overrides?: Partial<Express.Multer.File>): Express.Multer.File => ({
    fieldname: "file",
    originalname: "test.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: 1024,
    buffer: Buffer.from("test"),
    stream: {} as any,
    destination: "",
    filename: "",
    path: "",
    ...overrides
  });

  describe("Complete valid form", () => {
    it("should return no errors for a valid form", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toHaveLength(0);
    });
  });

  describe("File validation", () => {
    it("should return error when file is missing", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, undefined, mockTranslations);
      expect(errors).toContainEqual({
        text: "File is required",
        href: "#file"
      });
    });

    it("should return error for invalid file type", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const file = createMockFile({ originalname: "test.exe" });
      const errors = await validateForm(body, file, mockTranslations);
      expect(errors).toContainEqual({
        text: "Invalid file type",
        href: "#file"
      });
    });

    it("should return error when file is too large", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const file = createMockFile({ size: 3 * 1024 * 1024 }); // 3MB
      const errors = await validateForm(body, file, mockTranslations);
      expect(errors).toContainEqual({
        text: "File too large, please upload file smaller than 2MB",
        href: "#file"
      });
    });

    it("should accept valid file extensions", async () => {
      const validExtensions = ["csv", "doc", "docx", "htm", "html", "json", "pdf"];

      for (const ext of validExtensions) {
        const body = {
          locationId: "123",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          hearingStartDate: { day: "15", month: "06", year: "2025" },
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          displayFrom: { day: "10", month: "06", year: "2025" },
          displayTo: { day: "20", month: "06", year: "2025" }
        };

        const file = createMockFile({ originalname: `test.${ext}` });
        const errors = await validateForm(body, file, mockTranslations);

        // Should not have file type error
        expect(errors.some((e) => e.text === "Invalid file type")).toBe(false);
      }
    });
  });

  describe("Required field validation", () => {
    it("should return error when locationId is missing", async () => {
      const body = {
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Court name too short",
        href: "#court"
      });
    });

    it("should return error when locationId is not a valid number", async () => {
      const body = {
        locationId: "invalid",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Court is required",
        href: "#court"
      });
    });

    it("should return error when listType is missing", async () => {
      const body = {
        locationId: "123",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "List type is required",
        href: "#listType"
      });
    });

    it("should return error when sensitivity is missing", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Sensitivity is required",
        href: "#sensitivity"
      });
    });

    it("should return error when language is missing", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Language is required",
        href: "#language"
      });
    });
  });

  describe("Date validation", () => {
    it("should return error for invalid hearing start date", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "32", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Hearing start date is invalid",
        href: "#hearingStartDate"
      });
    });

    it("should return error for invalid display from date", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "32", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Display from date is invalid",
        href: "#displayFrom"
      });
    });

    it("should return error for invalid display to date", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "32", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Display to date is invalid",
        href: "#displayTo"
      });
    });

    it("should return error when display to is before display from", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "06", year: "2025" },
        displayTo: { day: "10", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Display to must be after display from",
        href: "#displayTo"
      });
    });

    it("should not return date comparison error when dates are equal", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "15", month: "06", year: "2025" },
        displayTo: { day: "15", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors.some((e) => e.text === "Display to must be after display from")).toBe(false);
    });
  });

  describe("Multiple validation errors", () => {
    it("should return all validation errors when multiple fields are invalid", async () => {
      const body = {
        locationId: "",
        listType: "",
        hearingStartDate: { day: "32", month: "13", year: "2025" },
        sensitivity: "",
        language: "",
        displayFrom: { day: "32", month: "06", year: "2025" },
        displayTo: { day: "10", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, undefined, mockTranslations);

      expect(errors.length).toBeGreaterThan(5);
      expect(errors.some((e) => e.text === "File is required")).toBe(true);
      expect(errors.some((e) => e.text === "Court name too short")).toBe(true);
      expect(errors.some((e) => e.text === "List type is required")).toBe(true);
      expect(errors.some((e) => e.text === "Sensitivity is required")).toBe(true);
      expect(errors.some((e) => e.text === "Language is required")).toBe(true);
    });
  });

  describe("JSON file validation (generic for all list types)", () => {
    it("should allow non-JSON files for any list type (flat file support)", async () => {
      const body = {
        locationId: "123",
        listType: "8",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const file = createMockFile({ originalname: "test.pdf" });
      const errors = await validateForm(body, file, mockTranslations);
      // Non-JSON files are valid (flat files) - no JSON validation is performed
      expect(errors).toHaveLength(0);
    });

    it("should error when JSON file has invalid schema for any list type", async () => {
      const body = {
        locationId: "123",
        listType: "8",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const invalidJson = JSON.stringify({ invalid: "data" });
      const file = createMockFile({
        originalname: "test.json",
        buffer: Buffer.from(invalidJson)
      });
      const errors = await validateForm(body, file, mockTranslations);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.text.includes("Invalid JSON file format"))).toBe(true);
    });

    it("should error when Civil and Family JSON file is malformed", async () => {
      const body = {
        locationId: "123",
        listType: "8",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const file = createMockFile({
        originalname: "test.json",
        buffer: Buffer.from("{ invalid json")
      });
      const errors = await validateForm(body, file, mockTranslations);
      expect(errors).toContainEqual({
        text: "Invalid JSON file format. Please ensure the file contains valid JSON.",
        href: "#file"
      });
    });
  });

  describe("Location name validation", () => {
    it("should error when locationName is present but locationId is empty", async () => {
      const body = {
        locationId: "",
        locationName: "Test Court",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Court is required",
        href: "#court"
      });
    });

    it("should error for court name too short when less than 3 characters", async () => {
      const body = {
        locationId: "",
        locationName: "AB",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const errors = await validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Court name too short",
        href: "#court"
      });
    });
  });

  describe("Date field length validation", () => {
    it("should error when day is not 2 characters", async () => {
      const result = validateDate({ day: "5", month: "06", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Invalid message",
        href: "#testField"
      });
    });

    it("should error when month is not 2 characters", async () => {
      const result = validateDate({ day: "15", month: "6", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Invalid message",
        href: "#testField"
      });
    });
  });
});
