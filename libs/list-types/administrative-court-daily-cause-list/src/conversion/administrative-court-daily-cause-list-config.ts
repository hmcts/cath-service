import { createConverter, type ExcelConverterConfig, registerConverter, validateNoHtmlTags } from "@hmcts/list-types-common";

// Matches h:mma, h.mma (e.g., 9:30am, 10.15pm) or ha (e.g., 9am, 2pm)
// Allows optional space before am/pm and trailing spaces
const TIME_PATTERN = /^(\d{1,2})([:.]\d{2})?\s*[ap]m\s*$/i;

function validateTimeFormat(value: string, rowNumber: number): void {
  const match = TIME_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid time format '${value}' in row ${rowNumber}. Expected format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)`);
  }

  const hour = Number.parseInt(match[1], 10);
  if (hour < 1 || hour > 12) {
    throw new Error(`Invalid time format '${value}' in row ${rowNumber}. Expected format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)`);
  }
}

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
