import { createJsonValidator } from "@hmcts/list-types-common";
import {
  utiacJrCardiffDailyHearingListCy as cy,
  utiacJrCardiffDailyHearingListEn as en,
  renderUtiacJrCardiffDailyHearingListData,
  type UtiacJrCardiffHearingList
} from "@hmcts/utiac-jr-daily-hearing-list";
import { schemaPath } from "@hmcts/utiac-jr-daily-hearing-list/config";
import { createSimpleListTypeHandler, createUtiacJrRegionalDailyRender, LIST_LOAD_SERVER_ERROR } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<UtiacJrCardiffHearingList>({
  en,
  cy,
  validate,
  logPrefix: "utiac-jr-cardiff-daily-hearing-list",
  serverError: LIST_LOAD_SERVER_ERROR,
  render: createUtiacJrRegionalDailyRender(renderUtiacJrCardiffDailyHearingListData, en, cy)
});
