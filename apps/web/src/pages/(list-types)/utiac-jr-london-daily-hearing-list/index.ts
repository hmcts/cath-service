import { createJsonValidator } from "@hmcts/list-types-common";
import {
  utiacJrLondonDailyHearingListCy as cy,
  utiacJrLondonDailyHearingListEn as en,
  renderUtiacJrLondonDailyHearingListData,
  type UtiacJrLondonHearingList
} from "@hmcts/utiac-jr-london-daily-hearing-list";
import { schemaPath } from "@hmcts/utiac-jr-london-daily-hearing-list/config";
import { createSimpleListTypeHandler, createUtiacDailyRender, LIST_LOAD_SERVER_ERROR } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<UtiacJrLondonHearingList>({
  en,
  cy,
  validate,
  logPrefix: "utiac-jr-london-daily-hearing-list",
  serverError: LIST_LOAD_SERVER_ERROR,
  render: createUtiacDailyRender(renderUtiacJrLondonDailyHearingListData, "utiac-jr-london-daily-hearing-list", en, cy)
});
