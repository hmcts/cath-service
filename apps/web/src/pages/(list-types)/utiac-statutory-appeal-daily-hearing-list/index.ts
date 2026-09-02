import { createJsonValidator } from "@hmcts/list-types-common";
import {
  utiacStatutoryAppealDailyHearingListCy as cy,
  utiacStatutoryAppealDailyHearingListEn as en,
  renderUtiacStatutoryAppealDailyHearingListData,
  type UtiacStatutoryAppealHearingList
} from "@hmcts/utiac-statutory-appeal-daily-hearing-list";
import { schemaPath } from "@hmcts/utiac-statutory-appeal-daily-hearing-list/config";
import { createSimpleListTypeHandler, createUtiacDailyRender, LIST_LOAD_SERVER_ERROR } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<UtiacStatutoryAppealHearingList>({
  en,
  cy,
  validate,
  logPrefix: "utiac-statutory-appeal-daily-hearing-list",
  serverError: LIST_LOAD_SERVER_ERROR,
  render: createUtiacDailyRender(renderUtiacStatutoryAppealDailyHearingListData, "utiac-statutory-appeal-daily-hearing-list", en, cy)
});
