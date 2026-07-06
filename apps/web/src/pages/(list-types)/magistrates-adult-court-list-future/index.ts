import {
  magistratesAdultCourtListCy as cy,
  magistratesAdultCourtListEn as en,
  type MagistratesAdultCourtListData,
  renderMagistratesAdultCourtList,
  validateMagistratesAdultCourtList
} from "@hmcts/magistrates-adult-court-list";
import { createCauseListRender, createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<MagistratesAdultCourtListData>({
  en,
  cy,
  validate: validateMagistratesAdultCourtList,
  logPrefix: "magistrates-adult-court-list-future",
  checkAccess: true,
  render: createCauseListRender(renderMagistratesAdultCourtList, "magistrates-adult-court-list-future/index", en, cy)
});
