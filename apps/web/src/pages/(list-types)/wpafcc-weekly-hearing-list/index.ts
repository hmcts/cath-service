import { createJsonValidator } from "@hmcts/list-types-common";
import {
  wpafccWeeklyHearingListCy as cy,
  wpafccWeeklyHearingListEn as en,
  renderWpafccWeeklyHearingListData,
  type WpafccWeeklyHearingList
} from "@hmcts/wpafcc-weekly-hearing-list";
import { schemaPath } from "@hmcts/wpafcc-weekly-hearing-list/config";
import { createSimpleListTypeHandler, createWeeklyHearingListRender, LIST_LOAD_SERVER_ERROR } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<WpafccWeeklyHearingList>({
  en,
  cy,
  validate,
  logPrefix: "wpafcc-weekly-hearing-list",
  serverError: LIST_LOAD_SERVER_ERROR,
  render: createWeeklyHearingListRender(
    renderWpafccWeeklyHearingListData,
    "First-tier Tribunal (War Pensions and Armed Forces Compensation)",
    "wpafcc-weekly-hearing-list",
    en,
    cy
  )
});
