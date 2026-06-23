import {
  type CauseListData,
  familyDailyCauseListCy as cy,
  familyDailyCauseListEn as en,
  renderCauseListData,
  validateFamilyDailyCauseList
} from "@hmcts/family-daily-cause-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CauseListData>({
  en,
  cy,
  validate: validateFamilyDailyCauseList,
  logPrefix: "family-daily-cause-list",
  checkAccess: true,
  render: createCauseListRender(renderCauseListData, "family-daily-cause-list", en, cy)
});
