import {
  createMultiSheetConverter,
  type ExcelConverterConfig,
  registerConverterByName,
  validateNoHtmlTags,
  validateTimeFormatSimple
} from "@hmcts/list-types-common";
import { SECTIONS } from "../sections.js";

// ChD/KB 7-field configuration used by every section tab. Simple time validation (no hour range
// check). Only "Additional Information" is optional; minRows is 0 so section sheets may be empty.
export const STANDARD_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Judge", fieldName: "judge", required: true, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Judge", rowNumber)] },
    { header: "Time", fieldName: "time", required: true, validators: [(value, rowNumber) => validateTimeFormatSimple(value, rowNumber)] },
    { header: "Venue", fieldName: "venue", required: true, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)] },
    { header: "Type", fieldName: "type", required: true, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Type", rowNumber)] },
    { header: "Case Number", fieldName: "caseNumber", required: true, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Number", rowNumber)] },
    { header: "Case Name", fieldName: "caseName", required: true, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Name", rowNumber)] },
    {
      header: "Additional Information",
      fieldName: "additionalInformation",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional Information", rowNumber)]
    }
  ],
  minRows: 0
};

// One worksheet per section, matched by the English section label (tab name). All 16 sections share
// the same field config, so a positional-index fallback cannot tell them apart and would silently
// mis-file a mis-named tab (e.g. a single "Sheet 1") into the first section. matchByNameOnly disables
// the fallback: unmatched tabs yield an empty section, and a workbook matching no section name is
// rejected with a clear error.
const convertBusinessAndPropertyRollsExcel = (buffer: Buffer) =>
  createMultiSheetConverter(
    buffer,
    SECTIONS.map((section, index) => ({
      worksheetName: section.en,
      worksheetIndex: index,
      dataKey: section.key,
      config: STANDARD_CONFIG
    })),
    { matchByNameOnly: true }
  );

registerConverterByName("BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST", {
  config: STANDARD_CONFIG,
  convertExcelToJson: convertBusinessAndPropertyRollsExcel as any
});
