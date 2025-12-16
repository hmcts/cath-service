import { describe, expect, it } from "vitest";
import { validateDate, validateManualUploadForm, validateNonStrategicUploadForm } from "./validation.js";

const mockTranslations = {
  title: "Manual upload",
  pageTitle: "Upload - Manual upload",
  warningTitle: "Warning",
  warningMessage: "Prior to upload you must ensure the file is suitable for publication",
  fileUploadLabel: "Manually upload a file",
  courtLabel: "Court name",
  listTypeLabel: "List type",
  listTypePlaceholder: "Please choose a list type",
  hearingStartDateLabel: "Hearing start date",
  hearingStartDateHint: "For example, 16 01 2022",
  sensitivityLabel: "Sensitivity",
  languageLabel: "Language",
  displayFromLabel: "Display file from",
  displayFromHint: "For example, 27 01 2022",
  displayToLabel: "Display file to",
  displayToHint: "For example, 18 02 2022",
  continueButton: "Continue",
  errorSummaryTitle: "There is a problem",
  pageHelpTitle: "Page help",
  pageHelpLists: "Lists",
  pageHelpListsText: "You must ensure that you only upload one file",
  pageHelpSensitivity: "Sensitivity",
  pageHelpSensitivityText: "You need to indicate which user group your document should be available to",
  pageHelpSensitivityPublic: "Public",
  pageHelpSensitivityPublicText: "Publication available to all users",
  pageHelpSensitivityPrivate: "Private",
  pageHelpSensitivityPrivateText: "Publication available to verified users",
  pageHelpSensitivityClassified: "Classified",
  pageHelpSensitivityClassifiedText: "Publication only available to verified users in eligible groups",
  pageHelpDisplayFrom: "Display from",
  pageHelpDisplayFromText: "This will be the date the publication is available from",
  pageHelpDisplayTo: "Display to",
  pageHelpDisplayToText: "This will be the last date the publication is available",
  dayLabel: "Day",
  monthLabel: "Month",
  yearLabel: "Year",
  backToTop: "Back to top",
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

describe("validateManualUploadForm", () => {
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, undefined, mockTranslations);
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
      const errors = await validateManualUploadForm(body, file, mockTranslations);
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
      const errors = await validateManualUploadForm(body, file, mockTranslations);
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
        const errors = await validateManualUploadForm(body, file, mockTranslations);

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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, undefined, mockTranslations);

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
      const errors = await validateManualUploadForm(body, file, mockTranslations);
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
      const errors = await validateManualUploadForm(body, file, mockTranslations);
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
      const errors = await validateManualUploadForm(body, file, mockTranslations);
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

      const errors = await validateManualUploadForm(body, createMockFile(), mockTranslations);
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

const mockNonStrategicTranslations = {
  title: "Upload excel file",
  pageTitle: "Upload - Upload excel file",
  warningTitle: "Warning",
  warningMessage: "Prior to upload you must ensure the file is suitable for publication",
  fileUploadLabel: "Manually upload a excel file (.xlsx), max size 2MB",
  courtLabel: "Court name",
  listTypeLabel: "List type",
  listTypePlaceholder: "Please choose a list type",
  hearingStartDateLabel: "Hearing start date",
  hearingStartDateHint: "For example, 16 01 2022",
  sensitivityLabel: "Sensitivity",
  languageLabel: "Language",
  displayFromLabel: "Display file from",
  displayFromHint: "For example, 27 01 2022",
  displayToLabel: "Display file to",
  displayToHint: "For example, 18 02 2022",
  continueButton: "Continue",
  errorSummaryTitle: "There is a problem",
  pageHelpTitle: "Page help",
  pageHelpLists: "Lists",
  pageHelpListsText: "You must ensure that you only upload one file",
  pageHelpSensitivity: "Sensitivity",
  pageHelpSensitivityText: "You need to indicate which user group your document should be available to",
  pageHelpSensitivityPublic: "Public",
  pageHelpSensitivityPublicText: "Publication available to all users",
  pageHelpSensitivityPrivate: "Private",
  pageHelpSensitivityPrivateText: "Publication available to verified users",
  pageHelpSensitivityClassified: "Classified",
  pageHelpSensitivityClassifiedText: "Publication only available to verified users in eligible groups",
  pageHelpDisplayFrom: "Display from",
  pageHelpDisplayFromText: "This will be the date the publication is available from",
  pageHelpDisplayTo: "Display to",
  pageHelpDisplayToText: "This will be the last date the publication is available",
  dayLabel: "Day",
  monthLabel: "Month",
  yearLabel: "Year",
  backToTop: "Back to top",
  errorMessages: {
    fileRequired: "Please provide a file",
    fileType: "The selected file type is not supported",
    fileSize: "The selected file must be smaller than 2MB",
    courtRequired: "Please enter and select a valid court",
    courtTooShort: "Court name must be three characters or more",
    listTypeRequired: "Please select a list type",
    sensitivityRequired: "Please select a sensitivity",
    languageRequired: "Select a language option",
    hearingStartDateRequired: "Please enter a valid hearing start date",
    hearingStartDateInvalid: "Please enter a valid hearing start date",
    displayFromRequired: "Please enter a valid display file from date",
    displayFromInvalid: "Please enter a valid display file from date",
    displayToRequired: "Please enter a valid display file to date",
    displayToInvalid: "Please enter a valid display file to date",
    displayToBeforeFrom: "'Display to' date must be the same as or later than 'Display from' date"
  }
};

describe("validateNonStrategicUploadForm", () => {
  const createMockFile = (overrides?: Partial<Express.Multer.File>): Express.Multer.File => ({
    fieldname: "file",
    originalname: "test.xlsx",
    encoding: "7bit",
    mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

      const errors = await validateNonStrategicUploadForm(body, createMockFile(), mockNonStrategicTranslations);
      expect(errors).toHaveLength(0);
    });
  });

  describe("File validation - xlsx only", () => {
    it("should accept xlsx file extension", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const file = createMockFile({ originalname: "test.xlsx" });
      const errors = await validateNonStrategicUploadForm(body, file, mockNonStrategicTranslations);
      expect(errors.some((e) => e.text === "The selected file type is not supported")).toBe(false);
    });

    it("should accept .xlsx with uppercase extension", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const file = createMockFile({ originalname: "test.XLSX" });
      const errors = await validateNonStrategicUploadForm(body, file, mockNonStrategicTranslations);
      expect(errors.some((e) => e.text === "The selected file type is not supported")).toBe(false);
    });

    it("should reject .xls file (old Excel format)", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const file = createMockFile({ originalname: "test.xls" });
      const errors = await validateNonStrategicUploadForm(body, file, mockNonStrategicTranslations);
      expect(errors).toContainEqual({
        text: "The selected file type is not supported",
        href: "#file"
      });
    });

    it("should reject .csv file", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const file = createMockFile({ originalname: "test.csv" });
      const errors = await validateNonStrategicUploadForm(body, file, mockNonStrategicTranslations);
      expect(errors).toContainEqual({
        text: "The selected file type is not supported",
        href: "#file"
      });
    });

    it("should reject .pdf file", async () => {
      const body = {
        locationId: "123",
        listType: "CIVIL_DAILY_CAUSE_LIST",
        hearingStartDate: { day: "15", month: "06", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "10", month: "06", year: "2025" },
        displayTo: { day: "20", month: "06", year: "2025" }
      };

      const file = createMockFile({ originalname: "document.pdf" });
      const errors = await validateNonStrategicUploadForm(body, file, mockNonStrategicTranslations);
      expect(errors).toContainEqual({
        text: "The selected file type is not supported",
        href: "#file"
      });
    });
  });
});
