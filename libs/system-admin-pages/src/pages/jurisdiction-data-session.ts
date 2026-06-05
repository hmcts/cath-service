export interface JurisdictionDataSession {
  jurisdictionData?: {
    id: number;
    type: "Jurisdiction" | "Sub-Jurisdiction" | "Region";
    name: string;
    welshName: string;
  };
  jurisdictionDataErrors?: Array<{ text: string; href: string }>;

  locationJurisdiction?: {
    locationId: number;
    locationName: string;
    locationWelshName: string;
  };
  locationJurisdictionSearchErrors?: Array<{ text: string; href: string }>;
}
