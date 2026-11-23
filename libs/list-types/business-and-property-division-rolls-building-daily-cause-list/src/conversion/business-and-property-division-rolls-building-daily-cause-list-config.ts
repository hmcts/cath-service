import {
  createMultiSheetConverter,
  type ExcelConverterConfig,
  registerConverterByName,
  type SheetConfig,
  validateNoHtmlTags,
  validateTimeFormatSimple
} from "@hmcts/list-types-common";
import { SECTIONS } from "../sections.js";

// ChD/KB 7-field configuration used by every section tab. Simple time validation (no hour range
// check). Only Time must have a value: PIP accepts a blank cell in every other column, because its
// schema requires each key but only the Time pattern rejects an empty string. A blank optional cell
// is still written as "", so the schema's required keys are satisfied. minRows is 0 so section sheets may be empty.
export const STANDARD_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Judge", fieldName: "judge", required: false, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Judge", rowNumber)] },
    { header: "Time", fieldName: "time", required: true, validators: [(value, rowNumber) => validateTimeFormatSimple(value, rowNumber)] },
    { header: "Venue", fieldName: "venue", required: false, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)] },
    { header: "Type", fieldName: "type", required: false, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Type", rowNumber)] },
    {
      header: "Case Number",
      fieldName: "caseNumber",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Number", rowNumber)]
    },
    { header: "Case Name", fieldName: "caseName", required: false, validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case Name", rowNumber)] },
    {
      header: "Additional Information",
      fieldName: "additionalInformation",
      required: false,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional Information", rowNumber)]
    }
  ],
  minRows: 0
};

// One worksheet per section, matched by section.worksheetName (the exact source-workbook tab name,
// which uses "&" for four sections and so differs from the display label). All 16 sections share the
// same field config, so a positional-index fallback cannot tell them apart and would silently
// mis-file a mis-named tab (e.g. a single "Sheet 1") into the first section. matchByNameOnly disables
// the fallback, and a workbook matching no section name is rejected with a clear error. A missing tab is
// left out of the converted data, and the schema (which requires all 16 keys) reports it at upload. A tab
// that is present but holds only the header row is a valid empty section (minRows: 0).
export const BUSINESS_AND_PROPERTY_SHEETS: SheetConfig[] = SECTIONS.map((section, index) => ({
  worksheetName: section.worksheetName,
  worksheetIndex: index,
  dataKey: section.key,
  config: STANDARD_CONFIG
}));

const convertBusinessAndPropertyRollsExcel = (buffer: Buffer) => createMultiSheetConverter(buffer, BUSINESS_AND_PROPERTY_SHEETS, { matchByNameOnly: true });

registerConverterByName("BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST", {
  config: STANDARD_CONFIG,
  sheets: BUSINESS_AND_PROPERTY_SHEETS,
  convertExcelToJson: convertBusinessAndPropertyRollsExcel as any
});
