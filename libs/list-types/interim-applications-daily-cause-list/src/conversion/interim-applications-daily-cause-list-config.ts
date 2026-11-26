import {
  createMultiSheetConverter,
  type ExcelConverterConfig,
  registerConverterByName,
  type SheetConfig,
  validateEmailFormat,
  validateNoHtmlTags,
  validateTimeFormatSimple
} from "@hmcts/list-types-common";

// Tab 1 (hearings) — seven columns, all of which must be present. Only Time must have a value:
// PIP accepts a blank cell in every other column, because its schema requires each key but only
// the Time pattern rejects an empty string. A blank optional cell is still written as "".
// Judge, Venue, Type, Case Number, Case Name and Additional Information reject HTML; Time is
// validated against the h:mma / ha format.
export const INTERIM_APPLICATIONS_HEARINGS_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Judge", fieldName: "judge", required: false, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Judge", rowNumber)] },
    { header: "Time", fieldName: "time", required: true, validators: [(value, rowNumber) => validateTimeFormatSimple(value, rowNumber)] },
    { header: "Venue", fieldName: "venue", required: false, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)] },
    { header: "Type", fieldName: "type", required: false, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Type", rowNumber)] },
    {
      header: "Case Number",
      fieldName: "caseNumber",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Number", rowNumber)]
    },
    { header: "Case Name", fieldName: "caseName", required: false, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Name", rowNumber)] },
    {
      header: "Additional Information",
      fieldName: "additionalInformation",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional Information", rowNumber)]
    }
  ],
  minRows: 1
};

// Tab 2 (open justice) carries the editable judge name + email that feed the first paragraph of
// the "Important information" section. The array may be empty, so minRows is 0. Either cell may be
// blank, as in PIP; validators (including the email format check) only run on non-blank values.
export const OPEN_JUSTICE_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Name to be displayed",
      fieldName: "nameToBeDisplayed",
      required: false,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Name to be displayed", rowNumber)]
    },
    {
      header: "Email",
      fieldName: "email",
      required: false,
      validators: [
        (value: string, rowNumber: number) => validateNoHtmlTags(value, "Email", rowNumber),
        (value: string, rowNumber: number) => validateEmailFormat(value, rowNumber)
      ]
    }
  ],
  minRows: 0
};

const INTERIM_APPLICATIONS_SHEETS: SheetConfig[] = [
  { worksheetName: "Hearing List", worksheetIndex: 0, dataKey: "hearingList", config: INTERIM_APPLICATIONS_HEARINGS_CONFIG },
  { worksheetName: "Open Justice Statement Details", worksheetIndex: 1, dataKey: "openJusticeStatementDetails", config: OPEN_JUSTICE_CONFIG }
];

const convertInterimApplicationsExcel = (buffer: Buffer) => createMultiSheetConverter(buffer, INTERIM_APPLICATIONS_SHEETS);

// The multi-sheet converter returns an object shape, not the array the single-sheet converter type
// expects, so a cast is required here (matching the sibling court-of-appeal-civil converter).
const converter = {
  config: INTERIM_APPLICATIONS_HEARINGS_CONFIG,
  sheets: INTERIM_APPLICATIONS_SHEETS,
  convertExcelToJson: convertInterimApplicationsExcel as any
};

registerConverterByName("INTERIM_APPLICATIONS_DAILY_CAUSE_LIST", converter);
