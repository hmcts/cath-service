import { createConverter, RCJ_EXCEL_CONFIG, registerConverter } from "@hmcts/list-types-common";

// RCJ Standard Daily Cause List (listTypeIds: 10-17)
export const STANDARD_EXCEL_CONFIG = RCJ_EXCEL_CONFIG;

// Register all 8 converters with the same config
// IDs: 10-17 (excluding 18 which is London Admin Court with 2-tab format)
for (const listTypeId of [10, 11, 12, 13, 14, 15, 16, 17]) {
  registerConverter(listTypeId, createConverter(STANDARD_EXCEL_CONFIG));
}
