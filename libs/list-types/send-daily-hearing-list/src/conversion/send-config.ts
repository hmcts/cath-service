import { createConverter, type ExcelConverterConfig, registerConverter, registerConverterByName, validateNoHtmlTags } from "@hmcts/list-types-common";

// Time pattern: matches formats like "10:30am", "2:45pm", "9am", "10.30am"
const TIME_PATTERN = /^\d{1,2}([:.]?\d{2})?[ap]m\s*$/i;

function validateTimeFormat(value: string, rowNumber: number): string | null {
  if (!value) {
    return `Row ${rowNumber}: Time is required`;
  }
  if (!TIME_PATTERN.test(value.trim())) {
    return `Row ${rowNumber}: Time must be in format like "10:30am" or "2pm"`;
  }
  return null;
}

// SEND Daily Hearing List (listTypeId: 28)
export const SEND_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Time",
      fieldName: "time",
      required: true,
      validators: [validateTimeFormat]
    },
    {
      header: "Case Reference Number",
      fieldName: "caseReferenceNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Reference Number", rowNumber)]
    },
    {
      header: "Respondent",
      fieldName: "respondent",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Respondent", rowNumber)]
    },
    {
      header: "Hearing Type",
      fieldName: "hearingType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing Type", rowNumber)]
    },
    {
      header: "Venue",
      fieldName: "venue",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)]
    },
    {
      header: "Time Estimate",
      fieldName: "timeEstimate",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Time Estimate", rowNumber)]
    }
  ],
  minRows: 1
};

// Register the SEND converter with listTypeId 28 and by name
const sendConverter = createConverter(SEND_EXCEL_CONFIG);
registerConverter(28, sendConverter);
registerConverterByName("SEND_DAILY_HEARING_LIST", sendConverter);
