import {
  type CrownDailyListData,
  crownDailyListCy as cy,
  crownDailyListEn as en,
  renderCrownDailyListData,
  validateCrownDailyList
} from "@hmcts/crown-daily-list";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { createListTypeHandler } from "../list-type-handler.js";

export const GET = createListTypeHandler<CrownDailyListData>({
  en,
  cy,
  validate: validateCrownDailyList,
  logPrefix: "crown-daily-cause-list",
  checkAccess: true,
  render: async ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, openJustice, listData } = await renderCrownDailyListData(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });
    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;
    res.render("crown-daily-cause-list", { en, cy, title: t.title, header, openJustice, listData, dataSource, t });
  }
});
