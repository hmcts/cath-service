import {
  type CauseListData,
  copDailyCauseListCy as cy,
  copDailyCauseListEn as en,
  renderCauseListData,
  validateCopDailyCauseList
} from "@hmcts/cop-daily-cause-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CauseListData>({
  en,
  cy,
  validate: validateCopDailyCauseList,
  logPrefix: "cop-daily-cause-list",
  checkAccess: true,
  render: createCauseListRender(renderCauseListData, "cop-daily-cause-list", en, cy)
});
