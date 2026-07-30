import {
  type CauseListData,
  etFortnightlyListCy as cy,
  etFortnightlyListEn as en,
  renderEtFortnightlyList,
  validateEtFortnightlyPressList
} from "@hmcts/et-fortnightly-list";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CauseListData>({
  en,
  cy,
  validate: validateEtFortnightlyPressList,
  logPrefix: "et-fortnightly-list",
  checkAccess: true,
  render: async ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, openJustice, courts } = await renderEtFortnightlyList(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });
    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;
    res.render("et-fortnightly-list", { en, cy, t, pageTitle: t.title, header, openJustice, courts, dataSource });
  }
});
