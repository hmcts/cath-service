import { createConverter, type ExcelConverterConfig, registerConverterByName, validateNoHtmlTags, validateTimeFormat } from "@hmcts/list-types-common";

export const AST_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Appellant",
      fieldName: "appellant",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Appellant", rowNumber)]
    },
    {
      header: "Appeal reference number",
      fieldName: "appealReferenceNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Appeal reference number", rowNumber)]
    },
    {
      header: "Case type",
      fieldName: "caseType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case type", rowNumber)]
    },
    {
      header: "Hearing type",
      fieldName: "hearingType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing type", rowNumber)]
    },
    {
      header: "Hearing time",
      fieldName: "hearingTime",
      required: true,
      validators: [(value, rowNumber) => validateTimeFormat(value, rowNumber)]
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

const astConverter = createConverter(AST_EXCEL_CONFIG);
registerConverterByName("AST_DAILY_HEARING_LIST", astConverter);
