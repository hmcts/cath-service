import type { SectionKey } from "../sections.js";

export interface ChdKbHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}

export type BusinessAndPropertyRollsData = Record<SectionKey, ChdKbHearing[]>;
