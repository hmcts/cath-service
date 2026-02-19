export interface StandardHearing {
  venue: string;
  judge: string;
  time: string;
  caseNumber: string;
  caseDetails: string;
  hearingType: string;
  additionalInformation: string;
}

export interface FutureJudgment extends StandardHearing {
  date: string; // dd/MM/yyyy format
}

export interface CourtOfAppealCivilData {
  dailyHearings: StandardHearing[];
  futureJudgments: FutureJudgment[];
}
