import { createJsonValidator } from "@hmcts/list-types-common";
import {
  utiacJrBirminghamDailyHearingListCy as cy,
  utiacJrBirminghamDailyHearingListEn as en,
  renderUtiacJrBirminghamDailyHearingListData,
  type UtiacJrBirminghamHearingList
} from "@hmcts/utiac-jr-birmingham-daily-hearing-list";
import { schemaPath } from "@hmcts/utiac-jr-birmingham-daily-hearing-list/config";
import { createSimpleListTypeHandler, createUtiacJrRegionalDailyRender, LIST_LOAD_SERVER_ERROR } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<UtiacJrBirminghamHearingList>({
  en,
  cy,
  validate,
  logPrefix: "utiac-jr-birmingham-daily-hearing-list",
  serverError: LIST_LOAD_SERVER_ERROR,
  render: createUtiacJrRegionalDailyRender(renderUtiacJrBirminghamDailyHearingListData, en, cy)
});
