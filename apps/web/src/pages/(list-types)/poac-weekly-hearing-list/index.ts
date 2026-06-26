import { createJsonValidator } from "@hmcts/list-types-common";
import {
  siacPoacPaacWeeklyHearingListCy as cy,
  siacPoacPaacWeeklyHearingListEn as en,
  renderSiacPoacPaacData,
  type SiacPoacPaacHearingList
} from "@hmcts/siac-poac-paac-weekly-hearing-list";
import { schemaPath } from "@hmcts/siac-poac-paac-weekly-hearing-list/config";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<SiacPoacPaacHearingList>({
  en,
  cy,
  validate,
  logPrefix: "poac-weekly-hearing-list",
  serverError: { errorTitle: "Server Error", errorMessage: "An error occurred while loading the list" },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;

    const { header, hearings } = renderSiacPoacPaacData(jsonData, {
      locale,
      courtName: "Proscribed Organisations Appeal Commission",
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.poacPageTitle
    });

    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });

    res.render("poac-weekly-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
