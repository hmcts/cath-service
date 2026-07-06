import {
  createConverter,
  DD_MM_YYYY_PATTERN,
  type ExcelConverterConfig,
  registerConverterByName,
  validateDateFormat,
  validateNoHtmlTags
} from "@hmcts/list-types-common";

// FTT RPT Weekly Hearing List — shared config for all 5 regional variants (listTypeIds: 33–37)
export const FTT_RPT_EXCEL_CONFIG: ExcelConverterConfig = {
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
      header: "Venue",
      fieldName: "venue",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)]
    },
    {
      header: "Case Type",
      fieldName: "caseType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Type", rowNumber)]
    },
    {
      header: "Case Reference Number",
      fieldName: "caseReferenceNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Reference Number", rowNumber)]
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
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Member(s)", rowNumber)]
    },
    {
      header: "Hearing Method",
      fieldName: "hearingMethod",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing Method", rowNumber)]
    },
    {
      header: "Additional Information",
      fieldName: "additionalInformation",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional Information", rowNumber)]
    }
  ],
  minRows: 1
};

const fttRptConverter = createConverter(FTT_RPT_EXCEL_CONFIG);

registerConverterByName("FTT_RPT_EASTERN_WEEKLY_HEARING_LIST", fttRptConverter);
registerConverterByName("FTT_RPT_LONDON_WEEKLY_HEARING_LIST", fttRptConverter);
registerConverterByName("FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST", fttRptConverter);
registerConverterByName("FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST", fttRptConverter);
registerConverterByName("FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST", fttRptConverter);
