import {
  type MagistratesAdultCourtListData,
  magistratesAdultCourtListDailyCy,
  magistratesAdultCourtListDailyEn,
  magistratesAdultCourtListFutureCy,
  magistratesAdultCourtListFutureEn,
  renderMagistratesAdultCourtList,
  validateMagistratesAdultCourtList
} from "@hmcts/magistrates-adult-court-list";
import { createListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const LIST_TYPE_LOCALES = {
  MAGISTRATES_ADULT_COURT_LIST_DAILY: { en: magistratesAdultCourtListDailyEn, cy: magistratesAdultCourtListDailyCy },
  MAGISTRATES_ADULT_COURT_LIST_FUTURE: { en: magistratesAdultCourtListFutureEn, cy: magistratesAdultCourtListFutureCy }
};

export const GET = createListTypeHandler<MagistratesAdultCourtListData>({
  en: magistratesAdultCourtListDailyEn,
  cy: magistratesAdultCourtListDailyCy,
  validate: validateMagistratesAdultCourtList,
  logPrefix: "magistrates-adult-court-list",
  checkAccess: true,
  render: async ({ artefact, jsonData, locale, res }) => {
    const locales = LIST_TYPE_LOCALES[artefact.listTypeName as keyof typeof LIST_TYPE_LOCALES] ?? LIST_TYPE_LOCALES.MAGISTRATES_ADULT_COURT_LIST_DAILY;
    const { en, cy } = locales;
    const t = locale === "cy" ? cy : en;
    const { header, openJustice, listData } = await renderMagistratesAdultCourtList(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });
    const dataSource = resolveDataSource(artefact.provenance);
    res.render("magistrates-adult-court-list", { en, cy, title: t.title, header, openJustice, listData, dataSource, t });
  }
});
