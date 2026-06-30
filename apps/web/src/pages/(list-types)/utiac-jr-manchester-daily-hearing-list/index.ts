import { createJsonValidator } from "@hmcts/list-types-common";
import {
  utiacJrManchesterDailyHearingListCy as cy,
  utiacJrManchesterDailyHearingListEn as en,
  renderUtiacJrManchesterDailyHearingListData,
  type UtiacJrManchesterHearingList
} from "@hmcts/utiac-jr-manchester-daily-hearing-list";
import { schemaPath } from "@hmcts/utiac-jr-manchester-daily-hearing-list/config";
import { createSimpleListTypeHandler, createUtiacJrRegionalDailyRender, LIST_LOAD_SERVER_ERROR } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<UtiacJrManchesterHearingList>({
  en,
  cy,
  validate,
  logPrefix: "utiac-jr-manchester-daily-hearing-list",
  serverError: LIST_LOAD_SERVER_ERROR,
  render: createUtiacJrRegionalDailyRender(renderUtiacJrManchesterDailyHearingListData, en, cy)
});
