import {
  type CauseListData,
  civilDailyCauseListCy as cy,
  civilDailyCauseListEn as en,
  renderCauseListData,
  validateCivilDailyCauseList
} from "@hmcts/civil-daily-cause-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CauseListData>({
  en,
  cy,
  validate: validateCivilDailyCauseList,
  logPrefix: "civil-daily-cause-list",
  checkAccess: true,
  render: createCauseListRender(renderCauseListData, "civil-daily-cause-list", en, cy)
});
