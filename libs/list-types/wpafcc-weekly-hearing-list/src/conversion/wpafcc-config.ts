import {
  createConverter,
  DD_MM_YYYY_PATTERN,
  type ExcelConverterConfig,
  registerConverterByName,
  validateDateFormat,
  validateNoHtmlTags,
  validateTimeFormatSimple
} from "@hmcts/list-types-common";

export const WPAFCC_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Date",
      fieldName: "date",
      required: true,
      validators: [validateDateFormat(DD_MM_YYYY_PATTERN, "dd/MM/yyyy (e.g., 02/01/2025)")]
    },
    {
      header: "Hearing time",
      fieldName: "hearingTime",
      required: true,
      validators: [validateTimeFormatSimple]
    },
    {
      header: "Case reference number",
      fieldName: "caseReferenceNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case reference number", rowNumber)]
    },
    {
      header: "Case name",
      fieldName: "caseName",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case name", rowNumber)]
    },
    {
      header: "Panel",
      fieldName: "panel",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Panel", rowNumber)]
    },
    {
      header: "Mode of hearing",
      fieldName: "modeOfHearing",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Mode of hearing", rowNumber)]
    },
    {
      header: "Venue",
      fieldName: "venue",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)]
    },
    {
      header: "Additional information",
      fieldName: "additionalInformation",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional information", rowNumber)]
    }
  ],
  minRows: 1
};

const wpafccConverter = createConverter(WPAFCC_EXCEL_CONFIG);
registerConverterByName("WPAFCC_WEEKLY_HEARING_LIST", wpafccConverter);
