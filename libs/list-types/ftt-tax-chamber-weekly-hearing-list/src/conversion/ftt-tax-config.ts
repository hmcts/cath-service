import {
  createConverter,
  DD_MM_YYYY_PATTERN,
  type ExcelConverterConfig,
  registerConverterByName,
  validateDateFormat,
  validateNoHtmlTags
} from "@hmcts/list-types-common";

// First-tier Tribunal (Tax Chamber) Weekly Hearing List (listTypeId: 31)
export const FTT_TAX_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Date",
      fieldName: "date",
      required: true,
      validators: [validateDateFormat(DD_MM_YYYY_PATTERN, "dd/MM/yyyy (e.g., 02/01/2025)")]
    },
    {
      header: "Hearing Time",
      fieldName: "hearingTime",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing Time", rowNumber)]
    },
    {
      header: "Case Name",
      fieldName: "caseName",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Name", rowNumber)]
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
      header: "Venue/Platform",
      fieldName: "venuePlatform",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue/Platform", rowNumber)]
    }
  ],
  minRows: 1
};

const fttTaxConverter = createConverter(FTT_TAX_EXCEL_CONFIG);
registerConverterByName("FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST", fttTaxConverter);
