import { createPartyDetails, formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import { DateTime } from "luxon";
import type {
  IacCase,
  IacDailyList,
  IacJudiciary,
  IacParty,
  IacRenderedCase,
  IacRenderedCourtList,
  IacRenderedData,
  IacRenderedSession,
  IacRenderedSitting,
  IacRenderOptions,
  IacSession,
  IacSitting
} from "../models/types.js";

const BAIL_LIST_NAME = "bail list";

// IAC party roles after conversion. Mirrors pip-frontend's IacDailyListService, which
// derives the Appellant/Applicant column from CLAIMANT_PETITIONER, the representative
// from CLAIMANT_PETITIONER_REPRESENTATIVE, and the Respondent column from
// PROSECUTING_AUTHORITY (see findAndManipulatePartyInformation in ListParseHelperService).
const APPELLANT_ROLE = "CLAIMANT_PETITIONER";
const APPELLANT_REPRESENTATIVE_ROLE = "CLAIMANT_PETITIONER_REPRESENTATIVE";
const PROSECUTING_AUTHORITY_ROLE = "PROSECUTING_AUTHORITY";

// Raw party-role codes mapped to their canonical role, mirroring pip-frontend's
// partyRoleMappings/convertPartyRole. Canonical roles (e.g. CLAIMANT_PETITIONER) are not
// listed and pass through unchanged.
const PARTY_ROLE_MAPPINGS: Record<string, string[]> = {
  APPLICANT_PETITIONER: ["APL", "APP", "CLP20", "CRED", "OTH", "PET"],
  APPLICANT_PETITIONER_REPRESENTATIVE: ["CREP", "CREP20"],
  RESPONDENT: ["DEBT", "DEF", "DEF20", "RES"],
  RESPONDENT_REPRESENTATIVE: ["DREP", "DREP20", "RREP"]
};

function convertPartyRole(partyRole: string): string {
  for (const [mappedRole, unmappedRoles] of Object.entries(PARTY_ROLE_MAPPINGS)) {
    if (unmappedRoles.includes(partyRole)) {
      return mappedRole;
    }
  }
  return partyRole;
}

export function renderIacDailyList(jsonData: IacDailyList, options: IacRenderOptions): IacRenderedData {
  const contentDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(jsonData.document.publicationDate, options.locale);

  const courtLists: IacRenderedCourtList[] = (jsonData.courtLists ?? []).map((courtList) => {
    const isBailList = courtList.courtListName.trim().toLowerCase() === BAIL_LIST_NAME;
    const sessions: IacRenderedSession[] = [];

    for (const courtRoom of courtList.courtHouse.courtRoom ?? []) {
      for (const session of courtRoom.session ?? []) {
        sessions.push({
          courtRoomName: courtRoom.courtRoomName,
          formattedJudiciary: formatJudiciary(session.judiciary),
          isBailList,
          sittings: (session.sittings ?? []).map((sitting) => renderSitting(sitting, session, options.locale))
        });
      }
    }

    return {
      courtListName: courtList.courtListName,
      session: sessions
    };
  });

  return {
    header: {
      listTitle: options.listTitle,
      venueName: jsonData.venue.venueName,
      contentDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: { courtLists }
  };
}

function renderSitting(sitting: IacSitting, session: IacSession, locale: string): IacRenderedSitting {
  return {
    startTime: formatSittingStart(sitting.sittingStart, locale),
    caseHearingChannel: formatHearingChannel(sitting, session),
    hearing: (sitting.hearing ?? []).map((hearing) => ({
      hearingType: hearing.hearingType ?? "",
      case: (hearing.case ?? []).map(renderCase)
    }))
  };
}

function renderCase(caseItem: IacCase): IacRenderedCase {
  const parties = extractCaseParties(caseItem.party);
  const caseRef = appendCaseSequenceIndicator(caseItem.caseNumber, caseItem.caseSequenceIndicator);

  return {
    caseRef,
    appellant: parties.appellant,
    appellantRepresentative: parties.appellantRepresentative,
    prosecutingAuthority: parties.prosecutingAuthority,
    language: caseItem.language ?? ""
  };
}

// Splits a case's party array into the Appellant/Applicant, representative and
// Prosecuting authority strings, mirroring pip-frontend's findAndManipulatePartyInformation.
export function extractCaseParties(party: IacParty[] | undefined): { appellant: string; appellantRepresentative: string; prosecutingAuthority: string } {
  const appellants: string[] = [];
  const representatives: string[] = [];
  const prosecutingAuthorities: string[] = [];

  for (const p of party ?? []) {
    if (!p.partyRole) continue;

    const details = createPartyDetails({ ...p, partyRole: p.partyRole }).trim();
    if (!details) continue;

    switch (convertPartyRole(p.partyRole)) {
      case APPELLANT_ROLE:
        appellants.push(details);
        break;
      case APPELLANT_REPRESENTATIVE_ROLE:
        representatives.push(details);
        break;
      case PROSECUTING_AUTHORITY_ROLE:
        prosecutingAuthorities.push(details);
        break;
    }
  }

  return {
    appellant: appellants.join(", "),
    appellantRepresentative: representatives.join(", "),
    prosecutingAuthority: prosecutingAuthorities.join(", ")
  };
}

function formatJudiciary(judiciary: IacJudiciary[] | undefined): string {
  const names: string[] = [];

  for (const joh of judiciary ?? []) {
    const name = [joh.johTitle?.trim(), joh.johNameSurname?.trim()].filter(Boolean).join(" ").trim();
    if (!name) continue;
    if (joh.isPresiding) {
      names.unshift(name);
    } else {
      names.push(name);
    }
  }

  return names.join(", ");
}

// Mirrors pip-frontend's formatDate(sittingStart, 'h:mma', language): a lower-cased
// 12-hour time that always shows two-digit minutes (e.g. "2:00pm", not "2pm").
function formatSittingStart(sittingStart: string | undefined, locale: string): string {
  if (!sittingStart || !/\S/.test(sittingStart)) {
    return "";
  }
  return DateTime.fromISO(sittingStart, { zone: "Europe/London" }).setLocale(locale).toFormat("h:mma").toLowerCase();
}

// Mirrors pip-frontend's appendCaseSequenceIndicator nunjucks filter: the sequence
// indicator is wrapped in square brackets and appended to the case number.
function appendCaseSequenceIndicator(caseNumber: string, caseSequenceIndicator: string | undefined): string {
  if (!caseSequenceIndicator) {
    return caseNumber;
  }
  const bracketed = `[${caseSequenceIndicator}]`;
  return caseNumber ? `${caseNumber} ${bracketed}` : bracketed;
}

function formatHearingChannel(sitting: IacSitting, session: IacSession): string {
  if (sitting.channel && sitting.channel.length > 0) {
    return sitting.channel.join(", ");
  }
  if (session.sessionChannel && session.sessionChannel.length > 0) {
    return session.sessionChannel.join(", ");
  }
  return "";
}
