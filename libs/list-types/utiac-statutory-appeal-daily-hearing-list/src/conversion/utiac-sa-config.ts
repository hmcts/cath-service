import {
  createConverter,
  type ExcelConverterConfig,
  registerConverter,
  registerConverterByName,
  validateNoHtmlTags,
  validateTimeFormatSimple
} from "@hmcts/list-types-common";

export const UTIAC_SA_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Hearing time",
      fieldName: "hearingTime",
      required: true,
      validators: [validateTimeFormatSimple]
    },
    {
      header: "Appellant",
      fieldName: "appellant",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Appellant", rowNumber)]
    },
    {
      header: "Representative",
      fieldName: "representative",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Representative", rowNumber)]
    },
    {
      header: "Appeal reference number",
      fieldName: "appealReferenceNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Appeal reference number", rowNumber)]
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

const utiacSaConverter = createConverter(UTIAC_SA_EXCEL_CONFIG);
registerConverter(30, utiacSaConverter);
registerConverterByName("UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST", utiacSaConverter);
