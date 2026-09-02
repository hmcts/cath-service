import {
  type CrownWarnedListData,
  crownWarnedListCy as cy,
  crownWarnedListEn as en,
  renderCrownWarnedListData,
  validateCrownWarnedList
} from "@hmcts/crown-warned-list";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CrownWarnedListData>({
  en,
  cy,
  validate: validateCrownWarnedList,
  logPrefix: "crown-warned-list",
  checkAccess: true,
  render: async ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, openJustice, groupedCategories } = await renderCrownWarnedListData(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });
    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;
    res.render("crown-warned-list", { en, cy, pageTitle: t.title, header, openJustice, groupedCategories, dataSource, t });
  }
});
