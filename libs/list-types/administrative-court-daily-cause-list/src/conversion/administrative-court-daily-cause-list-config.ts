import { createConverter, type ExcelConverterConfig, registerConverter, validateNoHtmlTags, validateTimeFormat } from "@hmcts/list-types-common";

// Administrative Court Daily Cause List (listTypeIds: 20-23)
// Same 7-field format as RCJ Standard lists
export const ADMIN_COURT_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Venue",
      fieldName: "venue",
      required: true,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Venue", rowNumber)]
    },
    {
      header: "Judge",
      fieldName: "judge",
      required: true,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Judge", rowNumber)]
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
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Case Number", rowNumber)]
    },
    {
      header: "Case Details",
      fieldName: "caseDetails",
      required: true,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Case Details", rowNumber)]
    },
    {
      header: "Hearing Type",
      fieldName: "hearingType",
      required: true,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Hearing Type", rowNumber)]
    },
    {
      header: "Additional Information",
      fieldName: "additionalInformation",
      required: false,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Additional Information", rowNumber)]
    }
  ],
  minRows: 1
};

// Register all 4 converters with the same config
// IDs: 20 (Birmingham), 21 (Leeds), 22 (Bristol/Cardiff), 23 (Manchester)
for (const listTypeId of [20, 21, 22, 23]) {
  registerConverter(listTypeId, createConverter(ADMIN_COURT_EXCEL_CONFIG));
}
