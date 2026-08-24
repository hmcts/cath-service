import { CHD_KB_EXCEL_CONFIG_SIMPLE_TIME } from "@hmcts/chd-kb-common";
import { createMultiSheetConverter, registerConverterByName } from "@hmcts/list-types-common";
import { SECTIONS } from "../sections.js";

// ChD/KB 7-field configuration used by every section tab
export const STANDARD_CONFIG = CHD_KB_EXCEL_CONFIG_SIMPLE_TIME;

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
