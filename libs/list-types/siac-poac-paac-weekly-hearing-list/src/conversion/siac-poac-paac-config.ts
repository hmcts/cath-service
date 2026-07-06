import {
  createConverter,
  DD_MM_YYYY_PATTERN,
  type ExcelConverterConfig,
  registerConverterByName,
  validateDateFormat,
  validateNoHtmlTags
} from "@hmcts/list-types-common";

// SIAC / POAC / PAAC Weekly Hearing List (listTypeIds: 28, 29, 30)
export const SIAC_POAC_PAAC_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Date",
      fieldName: "date",
      required: true,
      validators: [validateDateFormat(DD_MM_YYYY_PATTERN, "dd/MM/yyyy (e.g., 02/01/2025)")]
    },
    {
      header: "Time",
      fieldName: "time",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Time", rowNumber)]
    },
    {
      header: "Appellant",
      fieldName: "appellant",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Appellant", rowNumber)]
    },
    {
      header: "Case Reference Number",
      fieldName: "caseReferenceNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Reference Number", rowNumber)]
    },
    {
      header: "Hearing Type",
      fieldName: "hearingType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing Type", rowNumber)]
    },
    {
      header: "Courtroom",
      fieldName: "courtroom",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Courtroom", rowNumber)]
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

const siacPoacPaacConverter = createConverter(SIAC_POAC_PAAC_EXCEL_CONFIG);

registerConverterByName("SIAC_WEEKLY_HEARING_LIST", siacPoacPaacConverter);
registerConverterByName("POAC_WEEKLY_HEARING_LIST", siacPoacPaacConverter);
registerConverterByName("PAAC_WEEKLY_HEARING_LIST", siacPoacPaacConverter);
