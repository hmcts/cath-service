import { describe, expect, it } from "vitest";
import { validateDate, validateForm } from "./validation.js";

const mockTranslations = {
  errors: {
    fileRequired: "File is required",
    fileType: "Invalid file type",
    fileSize: "File too large",
    courtRequired: "Court is required",
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
    it("should return null for a valid date", () => {
      const result = validateDate({ day: "15", month: "6", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toBeNull();
    });

    it("should return null for a valid leap year date", () => {
      const result = validateDate({ day: "29", month: "2", year: "2024" }, "testField", "Required message", "Invalid message");
      expect(result).toBeNull();
    });
  });

  describe("Missing date inputs", () => {
    it("should return error when date input is undefined", () => {
      const result = validateDate(undefined, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Required message",
        href: "#testField"
      });
    });

    it("should return error when day is missing", () => {
      const result = validateDate({ day: "", month: "6", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Required message",
        href: "#testField"
      });
    });

    it("should return error when month is missing", () => {
      const result = validateDate({ day: "15", month: "", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Required message",
        href: "#testField"
      });
    });

    it("should return error when year is missing", () => {
      const result = validateDate({ day: "15", month: "6", year: "" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Required message",
        href: "#testField"
      });
    });
  });

  describe("Invalid dates", () => {
    it("should return error for invalid day", () => {
      const result = validateDate({ day: "32", month: "1", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Invalid message",
        href: "#testField"
      });
    });

    it("should return error for invalid month", () => {
      const result = validateDate({ day: "15", month: "13", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Invalid message",
        href: "#testField"
      });
    });

    it("should return error for February 29 in non-leap year", () => {
      const result = validateDate({ day: "29", month: "2", year: "2025" }, "testField", "Required message", "Invalid message");
      expect(result).toEqual({
        text: "Invalid message",
        href: "#testField"
      });
    });

    it("should return error for non-numeric values", () => {
      const result = validateDate({ day: "abc", month: "6", year: "2025" }, "testField", "Required message", "Invalid message");
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
    it("should return no errors for a valid form", () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "6", year: "2025" },
        displayTo: { day: "20", month: "6", year: "2025" }
      };

      const errors = validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toHaveLength(0);
    });
  });

  describe("File validation", () => {
    it("should return error when file is missing", () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "6", year: "2025" },
        displayTo: { day: "20", month: "6", year: "2025" }
      };

      const errors = validateForm(body, undefined, mockTranslations);
      expect(errors).toContainEqual({
        text: "File is required",
        href: "#file"
      });
    });

    it("should return error for invalid file type", () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "6", year: "2025" },
        displayTo: { day: "20", month: "6", year: "2025" }
      };

      const file = createMockFile({ originalname: "test.exe" });
      const errors = validateForm(body, file, mockTranslations);
      expect(errors).toContainEqual({
        text: "Invalid file type",
        href: "#file"
      });
    });

    it("should return error when file is too large", () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "6", year: "2025" },
        displayTo: { day: "20", month: "6", year: "2025" }
      };

      const file = createMockFile({ size: 3 * 1024 * 1024 }); // 3MB
      const errors = validateForm(body, file, mockTranslations);
      expect(errors).toContainEqual({
        text: "File too large",
        href: "#file"
      });
    });

    it("should accept valid file extensions", () => {
      const validExtensions = ["csv", "doc", "docx", "htm", "html", "json", "pdf"];

      for (const ext of validExtensions) {
        const body = {
          locationId: "123",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          hearingStartDate: { day: "15", month: "6", year: "2025" },
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          displayFrom: { day: "10", month: "6", year: "2025" },
          displayTo: { day: "20", month: "6", year: "2025" }
        };

        const file = createMockFile({ originalname: `test.${ext}` });
        const errors = validateForm(body, file, mockTranslations);

        // Should not have file type error
        expect(errors.some((e) => e.text === "Invalid file type")).toBe(false);
      }
    });
  });

  describe("Required field validation", () => {
    it("should return error when locationId is missing", () => {
      const body = {
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "6", year: "2025" },
        displayTo: { day: "20", month: "6", year: "2025" }
      };

      const errors = validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Court is required",
        href: "#court"
      });
    });

    it("should return error when locationId is too short", () => {
      const body = {
        locationId: "12",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "6", year: "2025" },
        displayTo: { day: "20", month: "6", year: "2025" }
      };

      const errors = validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Court is required",
        href: "#court"
      });
    });

    it("should return error when listType is missing", () => {
      const body = {
        locationId: "123",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "6", year: "2025" },
        displayTo: { day: "20", month: "6", year: "2025" }
      };

      const errors = validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "List type is required",
        href: "#listType"
      });
    });

    it("should return error when sensitivity is missing", () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        language: "ENGLISH",
        displayFrom: { day: "10", month: "6", year: "2025" },
        displayTo: { day: "20", month: "6", year: "2025" }
      };

      const errors = validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Sensitivity is required",
        href: "#sensitivity"
      });
    });

    it("should return error when language is missing", () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        displayFrom: { day: "10", month: "6", year: "2025" },
        displayTo: { day: "20", month: "6", year: "2025" }
      };

      const errors = validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Language is required",
        href: "#language"
      });
    });
  });

  describe("Date validation", () => {
    it("should return error for invalid hearing start date", () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "32", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "6", year: "2025" },
        displayTo: { day: "20", month: "6", year: "2025" }
      };

      const errors = validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Hearing start date is invalid",
        href: "#hearingStartDate"
      });
    });

    it("should return error for invalid display from date", () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "32", month: "6", year: "2025" },
        displayTo: { day: "20", month: "6", year: "2025" }
      };

      const errors = validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Display from date is invalid",
        href: "#displayFrom"
      });
    });

    it("should return error for invalid display to date", () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "6", year: "2025" },
        displayTo: { day: "32", month: "6", year: "2025" }
      };

      const errors = validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Display to date is invalid",
        href: "#displayTo"
      });
    });

    it("should return error when display to is before display from", () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "6", year: "2025" },
        displayTo: { day: "10", month: "6", year: "2025" }
      };

      const errors = validateForm(body, createMockFile(), mockTranslations);
      expect(errors).toContainEqual({
        text: "Display to must be after display from",
        href: "#displayTo"
      });
    });

    it("should not return date comparison error when dates are equal", () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "6", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "15", month: "6", year: "2025" },
        displayTo: { day: "15", month: "6", year: "2025" }
      };

      const errors = validateForm(body, createMockFile(), mockTranslations);
      expect(errors.some((e) => e.text === "Display to must be after display from")).toBe(false);
    });
  });

  describe("Multiple validation errors", () => {
    it("should return all validation errors when multiple fields are invalid", () => {
      const body = {
        locationId: "",
        listType: "",
        hearingStartDate: { day: "32", month: "13", year: "2025" },
        sensitivity: "",
        language: "",
        displayFrom: { day: "32", month: "6", year: "2025" },
        displayTo: { day: "10", month: "6", year: "2025" }
      };

      const errors = validateForm(body, undefined, mockTranslations);

      expect(errors.length).toBeGreaterThan(5);
      expect(errors.some((e) => e.text === "File is required")).toBe(true);
      expect(errors.some((e) => e.text === "Court is required")).toBe(true);
      expect(errors.some((e) => e.text === "List type is required")).toBe(true);
      expect(errors.some((e) => e.text === "Sensitivity is required")).toBe(true);
      expect(errors.some((e) => e.text === "Language is required")).toBe(true);
    });
  });
});
