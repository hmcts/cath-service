import { CHD_KB_EXCEL_CONFIG } from "@hmcts/chd-kb-common";
import { createConverter, registerConverterByName } from "@hmcts/list-types-common";

// Field definitions live in @hmcts/chd-kb-common and are shared with other list types using the
// same schema. Registration under this list type's own DB name must stay here, since each CHD/KB
// list type has a distinct name and the converter registry is keyed on that name.
export const COMPETITION_LIST_CHD_EXCEL_CONFIG = CHD_KB_EXCEL_CONFIG;

const competitionListChdConverter = createConverter(COMPETITION_LIST_CHD_EXCEL_CONFIG);
registerConverterByName("COMPETITION_LIST_CHD_DAILY_CAUSE_LIST", competitionListChdConverter);
