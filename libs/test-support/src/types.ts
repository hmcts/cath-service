export interface CreateLocationInput {
  locationId?: number;
  name: string;
  welshName: string;
  email?: string;
  contactNo?: string;
  regionIds?: number[];
  subJurisdictionIds?: number[];
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  surname: string;
  userProvenance?: string;
  userProvenanceId?: string;
  role?: string;
}

export interface CreateSubscriptionInput {
  userId: string;
  searchType: string;
  searchValue: string;
}

export interface CreateArtefactInput {
  locationId: string;
  listTypeId: number;
  contentDate: string;
  sensitivity?: string;
  language?: string;
  displayFrom?: string;
  displayTo?: string;
  isFlatFile?: boolean;
  provenance?: string;
}
