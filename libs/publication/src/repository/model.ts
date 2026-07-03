export interface Artefact {
  artefactId: string;
  type: string;
  locationId: string;
  listTypeId: number;
  listTypeName?: string;
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
