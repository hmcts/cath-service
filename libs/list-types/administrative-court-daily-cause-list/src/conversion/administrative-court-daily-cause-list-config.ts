import { createConverter, RCJ_EXCEL_CONFIG, registerConverter } from "@hmcts/list-types-common";

// Administrative Court Daily Cause List (listTypeIds: 20-23)
// Same 7-field format as RCJ Standard lists
export const ADMIN_COURT_EXCEL_CONFIG = RCJ_EXCEL_CONFIG;

// Register all 4 converters with the same config
// IDs: 20 (Birmingham), 21 (Leeds), 22 (Bristol/Cardiff), 23 (Manchester)
for (const listTypeId of [20, 21, 22, 23]) {
  registerConverter(listTypeId, createConverter(ADMIN_COURT_EXCEL_CONFIG));
}
