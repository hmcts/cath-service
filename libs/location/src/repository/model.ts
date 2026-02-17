export interface Location {
  locationId: number;
  name: string;
  welshName: string;
  regions: number[];
  subJurisdictions: number[];
}

export interface Region {
  regionId: number;
  name: string;
  welshName: string;
}

export interface Jurisdiction {
  jurisdictionId: number;
  name: string;
  welshName: string;
}

export interface SubJurisdiction {
  subJurisdictionId: number;
  name: string;
  welshName: string;
  jurisdictionId: number;
}

export interface LocationDetails {
  locationId: number;
  name: string;
  welshName: string;
  regions: Array<{ name: string; welshName: string }>;
  subJurisdictions: Array<{ name: string; welshName: string; jurisdictionName: string; jurisdictionWelshName: string }>;
}

export interface LocationMetadata {
  locationMetadataId: string;
  locationId: number;
  cautionMessage: string | null;
  welshCautionMessage: string | null;
  noListMessage: string | null;
  welshNoListMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLocationMetadataInput {
  locationId: number;
  cautionMessage?: string;
  welshCautionMessage?: string;
  noListMessage?: string;
  welshNoListMessage?: string;
}

export interface UpdateLocationMetadataInput {
  cautionMessage?: string;
  welshCautionMessage?: string;
  noListMessage?: string;
  welshNoListMessage?: string;
}
