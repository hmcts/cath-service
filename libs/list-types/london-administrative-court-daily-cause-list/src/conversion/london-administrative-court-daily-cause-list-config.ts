import { createMultiSheetConverter, RCJ_EXCEL_CONFIG_SIMPLE_TIME, registerConverter } from "@hmcts/list-types-common";

// Standard 7 fields configuration for both tabs
export const STANDARD_CONFIG = RCJ_EXCEL_CONFIG_SIMPLE_TIME;

// Multi-sheet converter for London Administrative Court
const convertLondonAdminExcel = (buffer: Buffer) =>
  createMultiSheetConverter(buffer, [
    { worksheetName: "Main hearings", worksheetIndex: 0, dataKey: "mainHearings", config: STANDARD_CONFIG },
    { worksheetName: "Planning Court", worksheetIndex: 1, dataKey: "planningCourt", config: STANDARD_CONFIG }
  ]);

// Register the converter with listTypeId 18
registerConverter(18, {
  config: STANDARD_CONFIG,
  convertExcelToJson: convertLondonAdminExcel as any
});
