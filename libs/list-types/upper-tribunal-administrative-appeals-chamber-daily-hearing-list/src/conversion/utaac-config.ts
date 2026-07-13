import { createConverter, type ExcelConverterConfig, registerConverterByName, validateNoHtmlTags } from "@hmcts/list-types-common";

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
      header: "Mode of Hearing",
      fieldName: "modeOfHearing",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Mode of Hearing", rowNumber)]
    },
    {
      header: "Venue",
      fieldName: "venue",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)]
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

const utaacConverter = createConverter(UTAAC_EXCEL_CONFIG);
registerConverterByName("UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST", utaacConverter);
