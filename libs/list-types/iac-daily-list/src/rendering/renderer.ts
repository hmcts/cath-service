import { createPartyDetails, formatDisplayDate, formatLastUpdatedDateTime, formatTime } from "@hmcts/list-types-common";
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
const APPELLANT_ROLE = "APPELLANT";
const RESPONDENT_ROLE = "RESPONDENT";
const APPELLANT_REPRESENTATIVE_ROLE = "APPELLANT_REPRESENTATIVE";

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
          sittings: (session.sittings ?? []).map((sitting) => renderSitting(sitting, session))
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

function renderSitting(sitting: IacSitting, session: IacSession): IacRenderedSitting {
  return {
    startTime: sitting.sittingStart ? formatTime(sitting.sittingStart) : "",
    caseHearingChannel: formatHearingChannel(sitting, session),
    hearing: (sitting.hearing ?? []).map((hearing) => ({
      hearingType: hearing.hearingType ?? "",
      case: (hearing.case ?? []).map(renderCase)
    }))
  };
}

function renderCase(caseItem: IacCase): IacRenderedCase {
  const parties = processParties(caseItem.party);
  const caseRef = caseItem.caseSequenceIndicator ? `${caseItem.caseNumber} ${caseItem.caseSequenceIndicator}`.trim() : caseItem.caseNumber;

  return {
    caseRef,
    appellant: parties.appellant,
    appellantRepresentative: parties.appellantRepresentative,
    prosecutingAuthority: parties.prosecutingAuthority,
    language: caseItem.language ?? ""
  };
}

function processParties(party: IacParty[] | undefined): { appellant: string; appellantRepresentative: string; prosecutingAuthority: string } {
  const appellants: string[] = [];
  const representatives: string[] = [];
  const prosecutingAuthorities: string[] = [];

  for (const p of party ?? []) {
    if (!p.partyRole) continue;

    const details = createPartyDetails({ ...p, partyRole: p.partyRole }).trim();
    if (!details) continue;

    switch (p.partyRole) {
      case APPELLANT_ROLE:
        appellants.push(details);
        break;
      case APPELLANT_REPRESENTATIVE_ROLE:
        representatives.push(details);
        break;
      case RESPONDENT_ROLE:
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

function formatHearingChannel(sitting: IacSitting, session: IacSession): string {
  if (sitting.channel && sitting.channel.length > 0) {
    return sitting.channel.join(", ");
  }
  if (session.sessionChannel && session.sessionChannel.length > 0) {
    return session.sessionChannel.join(", ");
  }
  return "";
}
