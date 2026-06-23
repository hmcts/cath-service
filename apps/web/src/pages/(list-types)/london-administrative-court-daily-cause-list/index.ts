import { createJsonValidator } from "@hmcts/list-types-common";
import {
  londonAdministrativeCourtDailyCauseListCy as cy,
  londonAdministrativeCourtDailyCauseListEn as en,
  type LondonAdminCourtData,
  renderLondonAdminCourt
} from "@hmcts/london-administrative-court-daily-cause-list";
import { schemaPath } from "@hmcts/london-administrative-court-daily-cause-list/config";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

export const ROUTES = ["/london-administrative-court-daily-cause-list"];

const validate = createJsonValidator(schemaPath);

const LONDON_ADMIN_COURT_LIST_TYPE_ID = 18;

export const GET = createSimpleListTypeHandler<LondonAdminCourtData>({
  en,
  cy,
  validate,
  logPrefix: "london-administrative-court-daily-cause-list",
  guardArtefact: (artefact, res) => {
    if (artefact.listTypeId !== LONDON_ADMIN_COURT_LIST_TYPE_ID) {
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid List Type",
        errorMessage: "This list type is not supported by this module"
      });
    }
    return undefined;
  },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, mainHearings, planningCourt } = renderLondonAdminCourt(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const dataSource =
      resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> }) ||
      PROVENANCE_LABELS[artefact.provenance] ||
      artefact.provenance;
    res.render("london-administrative-court-daily-cause-list", { en, cy, t, title: header.listTitle, header, mainHearings, planningCourt, dataSource });
  }
});
