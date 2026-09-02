import {
  fttTaxChamberWeeklyHearingListCy as cy,
  fttTaxChamberWeeklyHearingListEn as en,
  type FttTaxChamberHearingList,
  renderFttTaxChamberData
} from "@hmcts/ftt-tax-chamber-weekly-hearing-list";
import { schemaPath } from "@hmcts/ftt-tax-chamber-weekly-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<FttTaxChamberHearingList>({
  en,
  cy,
  validate,
  logPrefix: "ftt-tax-chamber-weekly-hearing-list",
  serverError: { errorTitle: "Server Error", errorMessage: "An error occurred while loading the list" },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;

    const { header, hearings } = renderFttTaxChamberData(jsonData, {
      locale,
      courtName: "First-tier Tribunal (Tax Chamber)",
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle
    });

    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });

    res.render("ftt-tax-chamber-weekly-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
