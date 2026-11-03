import {
  type CrownAdvanceListData,
  crownAdvanceListCy as cy,
  crownAdvanceListEn as en,
  renderCrownAdvanceListData,
  validateCrownAdvanceList
} from "@hmcts/crown-advanced-pdda-list";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CrownAdvanceListData>({
  en,
  cy,
  validate: validateCrownAdvanceList,
  logPrefix: "crown-advance-list",
  checkAccess: true,
  render: async ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, openJustice, groupedCategories } = await renderCrownAdvanceListData(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });
    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;
    res.render("crown-advance-list", { en, cy, pageTitle: t.title, header, openJustice, groupedCategories, dataSource, t });
  }
});
