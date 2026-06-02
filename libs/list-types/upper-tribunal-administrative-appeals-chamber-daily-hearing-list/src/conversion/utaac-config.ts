import { createConverter, type ExcelConverterConfig, registerConverter, registerConverterByName, validateNoHtmlTags } from "@hmcts/list-types-common";

export const UTAAC_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Time",
      fieldName: "time",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Time", rowNumber)]
    },
    {
      header: "Appellant",
      fieldName: "appellant",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Appellant", rowNumber)]
    },
    {
      header: "Case Reference Number",
      fieldName: "caseReferenceNumber",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Reference Number", rowNumber)]
    },
    {
      header: "Case Name",
      fieldName: "caseName",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Name", rowNumber)]
    },
    {
      header: "Judge(s)",
      fieldName: "judges",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Judge(s)", rowNumber)]
    },
    {
      header: "Member(s)",
      fieldName: "members",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Member(s)", rowNumber)]
    },
    {
      header: "Mode of Hearing",
      fieldName: "modeOfHearing",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Mode of Hearing", rowNumber)]
    },
    {
      header: "Venue",
      fieldName: "venue",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)]
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

const utaacConverter = createConverter(UTAAC_EXCEL_CONFIG);
registerConverter(30, utaacConverter);
registerConverterByName("UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST", utaacConverter);
