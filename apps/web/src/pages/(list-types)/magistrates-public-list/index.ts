import {
  magistratesPublicListCy as cy,
  magistratesPublicListEn as en,
  type MagistratesPublicListData,
  renderMagistratesPublicListData,
  validateMagistratesPublicList
} from "@hmcts/magistrates-public-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<MagistratesPublicListData>({
  en,
  cy,
  validate: validateMagistratesPublicList,
  logPrefix: "magistrates-public-list",
  checkAccess: true,
  render: createCauseListRender(renderMagistratesPublicListData, "magistrates-public-list", en, cy)
});
