import { createConverter, RCJ_EXCEL_CONFIG, registerConverterByName } from "@hmcts/list-types-common";

// Administrative Court Daily Cause List — 4 regional variants, same 7-field format as RCJ Standard
export const ADMIN_COURT_EXCEL_CONFIG = RCJ_EXCEL_CONFIG;

const converter = createConverter(ADMIN_COURT_EXCEL_CONFIG);

registerConverterByName("BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", converter);
registerConverterByName("LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", converter);
registerConverterByName("BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", converter);
registerConverterByName("MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", converter);
