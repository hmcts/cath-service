import {
  createConverter,
  DD_MM_YYYY_PATTERN,
  type ExcelConverterConfig,
  registerConverter,
  registerConverterByName,
  validateDateFormat,
  validateNoHtmlTags,
  validateTimeFormatSimple
} from "@hmcts/list-types-common";

export const GRC_EXCEL_CONFIG: ExcelConverterConfig = {
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
      header: "Judge(s)",
      fieldName: "judges",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Judge(s)", rowNumber)]
    },
    {
      header: "Member(s)",
      fieldName: "members",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Member(s)", rowNumber)]
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

const grcConverter = createConverter(GRC_EXCEL_CONFIG);
registerConverter(28, grcConverter);
registerConverterByName("GRC_WEEKLY_HEARING_LIST", grcConverter);
