import { renderCauseListData as renderCommonCauseListData } from "@hmcts/daily-cause-list-common";
import type { CauseListData, RenderOptions } from "../models/types.js";

// The COP schema carries reporting restrictions as a single `reportingRestrictions`
// string, whereas the shared renderer reads `reportingRestrictionDetail` (a string
// array). Map the COP field onto the shared shape so restrictions render correctly
// without duplicating the rest of the shared transform.
function mapReportingRestrictions(jsonData: CauseListData): CauseListData {
  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              const restriction = (caseItem as { reportingRestrictions?: string }).reportingRestrictions;
              if (restriction && !caseItem.reportingRestrictionDetail) {
                caseItem.reportingRestrictionDetail = [restriction];
              }
            }
          }
        }
      }
    }
  }

  return jsonData;
}

export function renderCauseListData(jsonData: CauseListData, options: RenderOptions) {
  return renderCommonCauseListData(mapReportingRestrictions(jsonData), options);
}
