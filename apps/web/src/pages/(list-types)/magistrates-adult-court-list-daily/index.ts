import {
  magistratesAdultCourtListDailyCy as cy,
  magistratesAdultCourtListDailyEn as en,
  type MagistratesAdultCourtListData,
  renderMagistratesAdultCourtList,
  validateMagistratesAdultCourtList
} from "@hmcts/magistrates-adult-court-list";
import { createListTypeHandler, resolveDataSource } from "../list-type-handler.js";

export const GET = createListTypeHandler<MagistratesAdultCourtListData>({
  en,
  cy,
  validate: validateMagistratesAdultCourtList,
  logPrefix: "magistrates-adult-court-list-daily",
  checkAccess: true,
  render: async ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, openJustice, listData } = await renderMagistratesAdultCourtList(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });
    const dataSource = resolveDataSource(artefact.provenance);
    res.render("magistrates-adult-court-list/index", { en, cy, title: t.title, header, openJustice, listData, dataSource, t });
  }
});
