import { type ExcelConverterConfig, validateNoHtmlTags, validateTimeFormatSimple } from "@hmcts/list-types-common";

export const CHD_KB_EXCEL_CONFIG: ExcelConverterConfig = {
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
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional Information", rowNumber)]
    }
  ],
  minRows: 1
};
