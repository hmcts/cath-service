import {
  createMultiSheetConverter,
  type ExcelConverterConfig,
  registerConverterByName,
  validateEmailFormat,
  validateNoHtmlTags,
  validateTimeFormatSimple
} from "@hmcts/list-types-common";

// Tab 1 (hearings) — the seven required fields. Judge, Venue, Type, Case Number, Case Name and
// Additional Information reject HTML; Time is validated against the h:mma / ha format.
export const INTERIM_APPLICATIONS_HEARINGS_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Judge", fieldName: "judge", required: true, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Judge", rowNumber)] },
    { header: "Time", fieldName: "time", required: true, validators: [(value, rowNumber) => validateTimeFormatSimple(value, rowNumber)] },
    { header: "Venue", fieldName: "venue", required: true, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)] },
    { header: "Type", fieldName: "type", required: true, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Type", rowNumber)] },
    { header: "Case Number", fieldName: "caseNumber", required: true, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Number", rowNumber)] },
    { header: "Case Name", fieldName: "caseName", required: true, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Name", rowNumber)] },
    {
      header: "Additional Information",
      fieldName: "additionalInformation",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional Information", rowNumber)]
    }
  ],
  minRows: 1
};

// Tab 2 (open justice) carries the editable judge name + email that feed the first paragraph of
// the "Important information" section. The array may be empty, so minRows is 0.
export const OPEN_JUSTICE_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Name to be displayed",
      fieldName: "nameToBeDisplayed",
      required: true,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Name to be displayed", rowNumber)]
    },
    {
      header: "Email",
      fieldName: "email",
      required: true,
      validators: [
        (value: string, rowNumber: number) => validateNoHtmlTags(value, "Email", rowNumber),
        (value: string, rowNumber: number) => validateEmailFormat(value, rowNumber)
      ]
    }
  ],
  minRows: 0
};

const convertInterimApplicationsExcel = (buffer: Buffer) =>
  createMultiSheetConverter(buffer, [
    { worksheetName: "Hearing List", worksheetIndex: 0, dataKey: "hearingList", config: INTERIM_APPLICATIONS_HEARINGS_CONFIG },
    { worksheetName: "Open Justice Statement Details", worksheetIndex: 1, dataKey: "openJusticeStatementDetails", config: OPEN_JUSTICE_CONFIG }
  ]);

// The multi-sheet converter returns an object shape, not the array the single-sheet converter type
// expects, so a cast is required here (matching the sibling court-of-appeal-civil converter).
const converter = {
  config: INTERIM_APPLICATIONS_HEARINGS_CONFIG,
  convertExcelToJson: convertInterimApplicationsExcel as any
};

registerConverterByName("INTERIM_APPLICATIONS_DAILY_CAUSE_LIST", converter);
