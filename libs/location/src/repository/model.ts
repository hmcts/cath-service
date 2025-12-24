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
