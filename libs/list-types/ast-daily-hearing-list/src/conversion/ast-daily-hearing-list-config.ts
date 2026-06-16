import { createConverter, type ExcelConverterConfig, registerConverterByName, validateNoHtmlTags } from "@hmcts/list-types-common";

const TIME_PATTERN = /^\d{1,2}([:.]?\d{2})?[ap]m\s*$/i;

function validateTimeFormat(value: string, rowNumber: number): void {
  if (!TIME_PATTERN.test(value)) {
    throw new Error(`Invalid time format '${value}' in row ${rowNumber}. Expected format like "10:30am" or "2pm"`);
  }
}

export const AST_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Appellant",
      fieldName: "appellant",
      required: true,
      validators: [(value, rowNum) => validateNoHtmlTags(value, "Appellant", rowNum)]
    },
    {
      header: "Appeal reference number",
      fieldName: "appealReferenceNumber",
      required: true,
      validators: [(value, rowNum) => validateNoHtmlTags(value, "Appeal reference number", rowNum)]
    },
    {
      header: "Case type",
      fieldName: "caseType",
      required: true,
      validators: [(value, rowNum) => validateNoHtmlTags(value, "Case type", rowNum)]
    },
    {
      header: "Hearing type",
      fieldName: "hearingType",
      required: true,
      validators: [(value, rowNum) => validateNoHtmlTags(value, "Hearing type", rowNum)]
    },
    {
      header: "Hearing time",
      fieldName: "hearingTime",
      required: true,
      validators: [validateTimeFormat]
    },
    {
      header: "Additional information",
      fieldName: "additionalInformation",
      required: true,
      validators: [(value, rowNum) => validateNoHtmlTags(value, "Additional information", rowNum)]
    }
  ],
  minRows: 1
};

// Register converter by name (will be mapped to list type ID in the database)
registerConverterByName("AST_DAILY_HEARING_LIST", createConverter(AST_EXCEL_CONFIG));
