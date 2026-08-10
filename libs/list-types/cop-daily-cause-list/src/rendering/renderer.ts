import { renderCauseListData as renderCommonCauseListData } from "@hmcts/daily-cause-list-common";
import type { CauseListData, RenderOptions } from "../models/types.js";

interface CopLocationDetails {
  region?: {
    name?: string;
    regionalJOH?: Array<{ johKnownAs?: string }>;
  };
}

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

// COP lists display the regional judiciary as a comma-separated string beneath the
// "In the Court of Protection" heading. Ports LocationHelper.formatRegionalJoh.
function formatRegionalJoh(locationDetails: CopLocationDetails | undefined): string {
  return (locationDetails?.region?.regionalJOH ?? [])
    .map((joh) => joh.johKnownAs?.trim())
    .filter((name): name is string => Boolean(name))
    .join(", ");
}

export async function renderCauseListData(jsonData: CauseListData, options: RenderOptions) {
  const rendered = await renderCommonCauseListData(mapReportingRestrictions(jsonData), options);
  const locationDetails = (jsonData as { locationDetails?: CopLocationDetails }).locationDetails;

  // Augment the shared header with the COP-specific region, regional lead judge and
  // court name used by the "In the Court of Protection" / "Sitting at" headings.
  return {
    ...rendered,
    header: {
      ...rendered.header,
      region: locationDetails?.region?.name?.trim() || "",
      regionalJoh: formatRegionalJoh(locationDetails),
      courtName: rendered.header.locationName
    },
    // The open justice contact statement must name the court, not the region venue.
    // The shared renderer defaults venueName to the region venue, so override it
    // with the resolved court name.
    openJustice: {
      ...rendered.openJustice,
      venueName: rendered.header.locationName
    }
  };
}
