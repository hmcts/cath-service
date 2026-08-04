import { CHD_KB_EXCEL_CONFIG } from "@hmcts/chd-kb-common";
import { createConverter, registerConverterByName } from "@hmcts/list-types-common";

// Field definitions live in @hmcts/chd-kb-common and are shared with future list types using the
// same schema. Registration under this list type's own DB name must stay here, since each CHD/KB
// list type has a distinct name and the converter registry is keyed on that name.
export const COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG = CHD_KB_EXCEL_CONFIG;

const companiesWindingUpChdConverter = createConverter(COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG);
registerConverterByName("COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST", companiesWindingUpChdConverter);
