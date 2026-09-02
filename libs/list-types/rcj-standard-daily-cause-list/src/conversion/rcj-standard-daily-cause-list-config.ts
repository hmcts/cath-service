import { createConverter, RCJ_EXCEL_CONFIG, registerConverterByName } from "@hmcts/list-types-common";

// RCJ Standard Daily Cause List — 8 variants, all using the same 7-field config
export const STANDARD_EXCEL_CONFIG = RCJ_EXCEL_CONFIG;

const converter = createConverter(STANDARD_EXCEL_CONFIG);

registerConverterByName("CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST", converter);
registerConverterByName("COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST", converter);
registerConverterByName("COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST", converter);
registerConverterByName("FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST", converter);
registerConverterByName("KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST", converter);
registerConverterByName("KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST", converter);
registerConverterByName("MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST", converter);
registerConverterByName("SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST", converter);
