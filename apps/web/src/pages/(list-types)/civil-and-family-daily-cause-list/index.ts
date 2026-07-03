import {
  type CauseListData,
  civilAndFamilyDailyCauseListCy as cy,
  civilAndFamilyDailyCauseListEn as en,
  renderCauseListData,
  validateCivilFamilyCauseList
} from "@hmcts/civil-and-family-daily-cause-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CauseListData>({
  en,
  cy,
  validate: validateCivilFamilyCauseList,
  logPrefix: "civil-and-family-daily-cause-list",
  checkAccess: true,
  render: createCauseListRender(renderCauseListData, "civil-and-family-daily-cause-list", en, cy)
});
