import {
  magistratesStandardListCy as cy,
  magistratesStandardListEn as en,
  type MagistratesStandardList,
  renderMagistratesStandardListData,
  validateMagistratesStandardList
} from "@hmcts/magistrates-standard-list";
import { listTypeHasExcel } from "@hmcts/publication";
import { createListTypeHandler, resolveDataSource } from "../list-type-handler.js";

export const GET = createListTypeHandler<MagistratesStandardList>({
  en,
  cy,
  validate: validateMagistratesStandardList,
  logPrefix: "magistrates-standard-list",
  checkAccess: true,
  render: async ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, listData } = await renderMagistratesStandardListData(jsonData, {
      locale,
      locationId: artefact.locationId,
      contentDate: artefact.contentDate
    });
    const dataSource = resolveDataSource(artefact.provenance);
    const pdfDownloadUrl = `/api/flat-file/${artefact.artefactId}/download`;
    const excelDownloadUrl = listTypeHasExcel(artefact.listTypeName) ? `/api/flat-file/${artefact.artefactId}/download?format=excel` : undefined;
    res.render("magistrates-standard-list", { en, cy, t, title: t.title, header, listData, dataSource, pdfDownloadUrl, excelDownloadUrl });
  }
});
