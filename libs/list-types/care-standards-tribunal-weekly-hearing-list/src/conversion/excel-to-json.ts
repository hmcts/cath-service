import { type ExcelConverterConfig, convertExcelToJson as genericConvertExcelToJson, validateDateFormat, validateNoHtmlTags } from "@hmcts/list-types-common";
import type { CareStandardsTribunalHearing } from "../models/types.js";

const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;

const CST_EXCEL_CONFIG: ExcelConverterConfig = {
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

export async function convertExcelToJson(buffer: Buffer): Promise<CareStandardsTribunalHearing[]> {
  return genericConvertExcelToJson<CareStandardsTribunalHearing>(buffer, CST_EXCEL_CONFIG);
}
