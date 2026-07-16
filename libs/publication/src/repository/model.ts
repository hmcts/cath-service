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

// Only getArtefactById performs the listType join that populates listTypeName.
// getArtefactsByLocation and getArtefactsByIds do not include this join.
export type ArtefactWithListType = Artefact & { listTypeName: string };
