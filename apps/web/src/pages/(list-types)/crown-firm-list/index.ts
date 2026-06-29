import { type CrownFirmListData, crownFirmListCy as cy, crownFirmListEn as en, renderCrownFirmListData, validateCrownFirmList } from "@hmcts/crown-firm-list";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CrownFirmListData>({
  en,
  cy,
  validate: validateCrownFirmList,
  logPrefix: "crown-firm-list",
  checkAccess: true,
  render: async ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, openJustice, listData, groupedListData } = await renderCrownFirmListData(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });
    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;
    res.render("crown-firm-list", { en, cy, title: t.title, header, openJustice, listData, groupedListData, dataSource, t });
  }
});
