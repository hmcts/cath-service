import {
  createMultiSheetConverter,
  type ExcelConverterConfig,
  registerConverter,
  validateNoHtmlTags,
  validateTimeFormatSimple
} from "@hmcts/list-types-common";

// Standard 7 fields configuration for both tabs
export const STANDARD_CONFIG: ExcelConverterConfig = {
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
      validators: [validateTimeFormatSimple]
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
  minRows: 0
};

// Multi-sheet converter for London Administrative Court
const convertLondonAdminExcel = (buffer: Buffer) =>
  createMultiSheetConverter(buffer, [
    { worksheetName: "Main hearings", worksheetIndex: 0, dataKey: "mainHearings", config: STANDARD_CONFIG },
    { worksheetName: "Planning Court", worksheetIndex: 1, dataKey: "planningCourt", config: STANDARD_CONFIG }
  ]);

// Register the converter with listTypeId 18
registerConverter(18, {
  config: STANDARD_CONFIG,
  convertExcelToJson: convertLondonAdminExcel as any
});
