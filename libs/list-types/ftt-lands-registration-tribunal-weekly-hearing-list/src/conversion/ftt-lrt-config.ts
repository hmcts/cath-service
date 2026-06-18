import {
  createConverter,
  DD_MM_YYYY_PATTERN,
  type ExcelConverterConfig,
  registerConverter,
  registerConverterByName,
  validateDateFormat,
  validateNoHtmlTags
} from "@hmcts/list-types-common";

// First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing List (listTypeId: 32)
export const FTT_LRT_EXCEL_CONFIG: ExcelConverterConfig = {
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
      header: "Judge",
      fieldName: "judge",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Judge", rowNumber)]
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

// Register the FTT LRT converter with listTypeId 32 and by name
// Name-based registration handles environments where the DB ID differs from the canonical seeded ID
const fttLrtConverter = createConverter(FTT_LRT_EXCEL_CONFIG);
registerConverter(32, fttLrtConverter);
registerConverterByName("FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST", fttLrtConverter);
