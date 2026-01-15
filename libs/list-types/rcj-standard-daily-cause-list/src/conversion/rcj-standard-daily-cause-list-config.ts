import { createConverter, type ExcelConverterConfig, registerConverter, validateNoHtmlTags, validateTimeFormat } from "@hmcts/list-types-common";

// RCJ Standard Daily Cause List (listTypeIds: 10-17)
export const STANDARD_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Venue",
      fieldName: "venue",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)]
    },
    {
      header: "Judge",
      fieldName: "judge",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Judge", rowNumber)]
    },
    {
      header: "Time",
      fieldName: "time",
      required: true,
      validators: [validateTimeFormat]
    },
    {
      header: "Case Number",
      fieldName: "caseNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Number", rowNumber)]
    },
    {
      header: "Case Details",
      fieldName: "caseDetails",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Details", rowNumber)]
    },
    {
      header: "Hearing Type",
      fieldName: "hearingType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing Type", rowNumber)]
    },
    {
      header: "Additional Information",
      fieldName: "additionalInformation",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional Information", rowNumber)]
    }
  ],
  minRows: 1
};

// Register all 8 converters with the same config
// IDs: 10-17 (excluding 18 which is London Admin Court with 2-tab format)
for (const listTypeId of [10, 11, 12, 13, 14, 15, 16, 17]) {
  registerConverter(listTypeId, createConverter(STANDARD_EXCEL_CONFIG));
}
