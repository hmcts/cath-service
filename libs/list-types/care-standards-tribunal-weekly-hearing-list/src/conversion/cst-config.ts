import { createConverter, type ExcelConverterConfig, registerConverter, validateDateFormat, validateNoHtmlTags } from "@hmcts/list-types-common";

const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;

// Care Standards Tribunal Weekly Hearing List (listTypeId: 9)
export const CST_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Date",
      fieldName: "date",
      required: true,
      validators: [validateDateFormat(DATE_PATTERN, "dd/MM/yyyy (e.g., 02/01/2025)")]
    },
    {
      header: "Case name",
      fieldName: "caseName",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case name", rowNumber)]
    },
    {
      header: "Hearing length",
      fieldName: "hearingLength",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing length", rowNumber)]
    },
    {
      header: "Hearing type",
      fieldName: "hearingType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing type", rowNumber)]
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
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional information", rowNumber)]
    }
  ],
  minRows: 1
};

// Register the CST converter with listTypeId 9
registerConverter(9, createConverter(CST_EXCEL_CONFIG));
