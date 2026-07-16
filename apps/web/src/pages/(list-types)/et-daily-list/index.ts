import { type CauseListData, etDailyListCy as cy, etDailyListEn as en, renderEtDailyList, validateEtDailyList } from "@hmcts/et-daily-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CauseListData>({
  en,
  cy,
  validate: validateEtDailyList,
  logPrefix: "et-daily-list",
  checkAccess: true,
  render: createCauseListRender(renderEtDailyList, "et-daily-list", en, cy)
});
