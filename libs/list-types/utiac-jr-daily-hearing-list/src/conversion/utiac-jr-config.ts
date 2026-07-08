import {
  createConverter,
  type ExcelConverterConfig,
  registerConverter,
  registerConverterByName,
  validateNoHtmlTags,
  validateTimeFormatSimple
} from "@hmcts/list-types-common";

export const UTIAC_JR_REGIONAL_EXCEL_CONFIG: ExcelConverterConfig = {
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

export const UTIAC_JR_LONDON_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Hearing time",
      fieldName: "hearingTime",
      required: true,
      validators: [validateTimeFormatSimple]
    },
    {
      header: "Case title",
      fieldName: "caseTitle",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case title", rowNumber)]
    },
    {
      header: "Representative",
      fieldName: "representative",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Representative", rowNumber)]
    },
    {
      header: "Case reference number",
      fieldName: "caseReferenceNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case reference number", rowNumber)]
    },
    {
      header: "Judge(s)",
      fieldName: "judges",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Judge(s)", rowNumber)]
    },
    {
      header: "Hearing type",
      fieldName: "hearingType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing type", rowNumber)]
    },
    {
      header: "Location",
      fieldName: "location",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Location", rowNumber)]
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

const utiacJrRegionalConverter = createConverter(UTIAC_JR_REGIONAL_EXCEL_CONFIG);
registerConverter(32, utiacJrRegionalConverter);
registerConverterByName("UTIAC_JR_LEEDS_DAILY_HEARING_LIST", utiacJrRegionalConverter);
registerConverter(33, utiacJrRegionalConverter);
registerConverterByName("UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST", utiacJrRegionalConverter);
registerConverter(34, utiacJrRegionalConverter);
registerConverterByName("UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST", utiacJrRegionalConverter);
registerConverter(35, utiacJrRegionalConverter);
registerConverterByName("UTIAC_JR_CARDIFF_DAILY_HEARING_LIST", utiacJrRegionalConverter);

const utiacJrLondonConverter = createConverter(UTIAC_JR_LONDON_EXCEL_CONFIG);
registerConverter(31, utiacJrLondonConverter);
registerConverterByName("UTIAC_JR_LONDON_DAILY_HEARING_LIST", utiacJrLondonConverter);
