export interface LocationMetadataSession {
  locationMetadata?: {
    locationId: number;
    locationName: string;
    locationWelshName: string;
    operation?: "created" | "updated" | "deleted";
  };
  locationMetadataSearchErrors?: Array<{ text: string; href: string }>;
}
