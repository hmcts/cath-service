import { createJsonValidator } from "@hmcts/list-types-common";
import {
  utiacJrLeedsDailyHearingListCy as cy,
  utiacJrLeedsDailyHearingListEn as en,
  renderUtiacJrLeedsDailyHearingListData,
  type UtiacJrLeedsHearingList
} from "@hmcts/utiac-jr-daily-hearing-list";
import { schemaPath } from "@hmcts/utiac-jr-daily-hearing-list/config";
import { createSimpleListTypeHandler, createUtiacJrRegionalDailyRender, LIST_LOAD_SERVER_ERROR } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<UtiacJrLeedsHearingList>({
  en,
  cy,
  validate,
  logPrefix: "utiac-jr-leeds-daily-hearing-list",
  serverError: LIST_LOAD_SERVER_ERROR,
  render: createUtiacJrRegionalDailyRender(renderUtiacJrLeedsDailyHearingListData, en, cy)
});
