export interface LocationMetadataSession {
  locationMetadata?: {
    locationId: number;
    locationName: string;
    locationWelshName: string;
    operation?: "created" | "updated" | "deleted";
  };
  locationMetadataSearchErrors?: Array<{ text: string; href: string }>;
}

export interface JurisdictionDataSession {
  jurisdictionData?: {
    id: number;
    type: "Jurisdiction" | "Sub-Jurisdiction" | "Region";
    name: string;
    welshName: string;
    jurisdictionId?: number;
  };
  jurisdictionDataErrors?: Array<{ text: string; href: string }>;

  locationJurisdiction?: {
    locationId: number;
    locationName: string;
    locationWelshName: string;
  };
  locationJurisdictionSearchErrors?: Array<{ text: string; href: string }>;
}
