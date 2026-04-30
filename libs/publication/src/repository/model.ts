export interface Artefact {
  artefactId: string;
  locationId: string;
  listTypeId: number;
  contentDate: Date;
  sensitivity: string;
  language: string;
  displayFrom: Date;
  displayTo: Date;
  lastReceivedDate: Date;
  isFlatFile: boolean;
  provenance: string;
  supersededCount?: number;
  noMatch: boolean;
}
