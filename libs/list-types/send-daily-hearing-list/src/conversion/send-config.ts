import { createConverter, type ExcelConverterConfig, registerConverterByName, validateNoHtmlTags, validateTimeFormat } from "@hmcts/list-types-common";

export const SEND_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Time",
      fieldName: "time",
      required: true,
      validators: [(value, rowNumber) => validateTimeFormat(value, rowNumber)]
    },
    {
      header: "Case reference number",
      fieldName: "caseReferenceNumber",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case reference number", rowNumber)]
    },
    {
      header: "Respondent",
      fieldName: "respondent",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Respondent", rowNumber)]
    },
    {
      header: "Hearing type",
      fieldName: "hearingType",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing type", rowNumber)]
    },
    {
      header: "Venue",
      fieldName: "venue",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)]
    },
    {
      header: "Time estimate",
      fieldName: "timeEstimate",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Time estimate", rowNumber)]
    }
  ],
  minRows: 1
};

const sendConverter = createConverter(SEND_EXCEL_CONFIG);
registerConverterByName("SEND_DAILY_HEARING_LIST", sendConverter);
