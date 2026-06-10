import { createConverter, type ExcelConverterConfig, registerConverter, registerConverterByName, validateNoHtmlTags } from "@hmcts/list-types-common";

export const SSCS_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Venue",
      fieldName: "venue",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)]
    },
    {
      header: "Appeal Reference Number",
      fieldName: "appealReferenceNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Appeal Reference Number", rowNumber)]
    },
    {
      header: "Hearing Type",
      fieldName: "hearingType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing Type", rowNumber)]
    },
    {
      header: "Appellant",
      fieldName: "appellant",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Appellant", rowNumber)]
    },
    {
      header: "Courtroom",
      fieldName: "courtroom",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Courtroom", rowNumber)]
    },
    {
      header: "Hearing Time",
      fieldName: "hearingTime",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing Time", rowNumber)]
    },
    {
      header: "Tribunal",
      fieldName: "tribunal",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Tribunal", rowNumber)]
    },
    {
      header: "FTA/Respondent",
      fieldName: "respondent",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "FTA/Respondent", rowNumber)]
    },
    {
      header: "Additional Information",
      fieldName: "additionalInformation",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional Information", rowNumber)]
    }
  ],
  minRows: 1
};

const sscsConverter = createConverter(SSCS_EXCEL_CONFIG);

// Register converters for all 8 SSCS list types by ID and by name
// IDs 28-35 correspond to the seeded SSCS list types
registerConverter(28, sscsConverter);
registerConverter(29, sscsConverter);
registerConverter(30, sscsConverter);
registerConverter(31, sscsConverter);
registerConverter(32, sscsConverter);
registerConverter(33, sscsConverter);
registerConverter(34, sscsConverter);
registerConverter(35, sscsConverter);

registerConverterByName("SSCS_MIDLANDS_DAILY_HEARING_LIST", sscsConverter);
registerConverterByName("SSCS_SOUTH_EAST_DAILY_HEARING_LIST", sscsConverter);
registerConverterByName("SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST", sscsConverter);
registerConverterByName("SSCS_SCOTLAND_DAILY_HEARING_LIST", sscsConverter);
registerConverterByName("SSCS_NORTH_EAST_DAILY_HEARING_LIST", sscsConverter);
registerConverterByName("SSCS_NORTH_WEST_DAILY_HEARING_LIST", sscsConverter);
registerConverterByName("SSCS_LONDON_DAILY_HEARING_LIST", sscsConverter);
registerConverterByName("SSCS_LIVERPOOL_DAILY_HEARING_LIST", sscsConverter);
