import {
  createConverter,
  type ExcelConverterConfig,
  registerConverter,
  registerConverterByName,
  validateNoHtmlTags,
  validateTimeFormatSimple
} from "@hmcts/list-types-common";

export const UTIAC_JR_LEEDS_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Venue",
      fieldName: "venue",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)]
    },
    {
      header: "Judge(s)",
      fieldName: "judges",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Judge(s)", rowNumber)]
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
      header: "Case title",
      fieldName: "caseTitle",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case title", rowNumber)]
    },
    {
      header: "Hearing type",
      fieldName: "hearingType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing type", rowNumber)]
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

const utiacJrLeedsConverter = createConverter(UTIAC_JR_LEEDS_EXCEL_CONFIG);
registerConverter(32, utiacJrLeedsConverter);
registerConverterByName("UTIAC_JR_LEEDS_DAILY_HEARING_LIST", utiacJrLeedsConverter);
