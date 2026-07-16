import { type CauseListData, etDailyListCy as cy, etDailyListEn as en, renderCauseListData, validateEtDailyList } from "@hmcts/et-daily-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CauseListData>({
  en,
  cy,
  validate: validateEtDailyList,
  logPrefix: "et-daily-list",
  checkAccess: true,
  render: createCauseListRender(renderCauseListData, "et-daily-list", en, cy)
});
