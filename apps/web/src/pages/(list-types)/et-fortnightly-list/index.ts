import {
  type CauseListData,
  etFortnightlyListCy as cy,
  etFortnightlyListEn as en,
  renderCauseListData,
  validateEtFortnightlyPressList
} from "@hmcts/et-fortnightly-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CauseListData>({
  en,
  cy,
  validate: validateEtFortnightlyPressList,
  logPrefix: "et-fortnightly-list",
  checkAccess: true,
  render: createCauseListRender(renderCauseListData, "et-fortnightly-list", en, cy)
});
