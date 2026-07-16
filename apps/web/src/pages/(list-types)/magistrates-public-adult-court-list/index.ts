import {
  magistratesPublicAdultCourtListCy as cy,
  magistratesPublicAdultCourtListEn as en,
  type MagistratesPublicAdultCourtListData,
  renderMagistratesPublicAdultCourtListData,
  validateMagistratesPublicAdultCourtList
} from "@hmcts/magistrates-public-adult-court-list";
import { createListTypeHandler, resolveDataSource } from "../list-type-handler.js";

export const GET = createListTypeHandler<MagistratesPublicAdultCourtListData>({
  en,
  cy,
  validate: validateMagistratesPublicAdultCourtList,
  logPrefix: "magistrates-public-adult-court-list",
  checkAccess: true,
  render: async ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, listData } = await renderMagistratesPublicAdultCourtListData(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });
    const dataSource = resolveDataSource(artefact.provenance);
    res.render("magistrates-public-adult-court-list", {
      en,
      cy,
      title: `${t.heading} ${header.locationName}`,
      header,
      listData,
      dataSource,
      t
    });
  }
});
