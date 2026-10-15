import { createMultiSheetConverter, RCJ_EXCEL_CONFIG_SIMPLE_TIME, registerConverterByName, type SheetConfig } from "@hmcts/list-types-common";

// Standard 7 fields configuration for both tabs
export const STANDARD_CONFIG = RCJ_EXCEL_CONFIG_SIMPLE_TIME;

export const LONDON_ADMIN_SHEETS: SheetConfig[] = [
  { worksheetName: "Main hearings", worksheetIndex: 0, dataKey: "mainHearings", config: STANDARD_CONFIG },
  { worksheetName: "Planning Court", worksheetIndex: 1, dataKey: "planningCourt", config: STANDARD_CONFIG }
];

const convertLondonAdminExcel = (buffer: Buffer) => createMultiSheetConverter(buffer, LONDON_ADMIN_SHEETS);

registerConverterByName("LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", {
  config: STANDARD_CONFIG,
  convertExcelToJson: convertLondonAdminExcel as any
});
