import {
  grcWeeklyHearingListCy as cy,
  grcWeeklyHearingListEn as en,
  type GrcWeeklyHearingList,
  renderGrcWeeklyHearingListData
} from "@hmcts/grc-weekly-hearing-list";
import { schemaPath } from "@hmcts/grc-weekly-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { createSimpleListTypeHandler, createWeeklyHearingListRender, LIST_LOAD_SERVER_ERROR } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<GrcWeeklyHearingList>({
  en,
  cy,
  validate,
  logPrefix: "grc-weekly-hearing-list",
  serverError: LIST_LOAD_SERVER_ERROR,
  render: createWeeklyHearingListRender(renderGrcWeeklyHearingListData, "General Regulatory Chamber", "grc-weekly-hearing-list", en, cy)
});
