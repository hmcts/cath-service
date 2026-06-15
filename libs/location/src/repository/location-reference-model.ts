export const LOCATION_REFERENCE_PROVENANCES = ["SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"] as const;
export type LocationReferenceProvenance = (typeof LOCATION_REFERENCE_PROVENANCES)[number];

export const LOCATION_REFERENCE_TYPES = ["VENUE", "REGION", "OWNING_HEARING_LOCATION", "NATIONAL"] as const;
export type LocationReferenceType = (typeof LOCATION_REFERENCE_TYPES)[number];
