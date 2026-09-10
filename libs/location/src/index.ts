export {
  buildJurisdictionItems,
  buildRegionItems,
  buildSubJurisdictionItemsByJurisdiction,
  getSubJurisdictionsForJurisdiction,
  type JurisdictionItem,
  type RegionItem,
  type SubJurisdictionItem
} from "./filtering/service.js";
export { locationData } from "./location-data.js";
export { deleteLocationMetadataRecord, findLocationMetadataByLocationId } from "./repository/location-metadata-queries.js";
export {
  createLocationMetadata,
  deleteLocationMetadata,
  getLocationMetadataByLocationId,
  updateLocationMetadata
} from "./repository/location-metadata-service.js";
export {
  LOCATION_REFERENCE_PROVENANCES,
  LOCATION_REFERENCE_TYPES,
  type LocationReferenceProvenance,
  type LocationReferenceType
} from "./repository/location-reference-model.js";
export { getLocationByProvenanceLocationId } from "./repository/location-reference-queries.js";
export type {
  CreateLocationMetadataInput,
  Jurisdiction,
  LocationDetails,
  LocationMetadata,
  Region,
  SubJurisdiction,
  UpdateLocationMetadataInput
} from "./repository/model.js";
export {
  deleteLocation,
  getAllJurisdictions,
  getAllLocations,
  getAllRegions,
  getAllSubJurisdictions,
  getLocationById,
  getLocationsByIds,
  getLocationWithDetails,
  getSubJurisdictionsByJurisdiction,
  hasActiveArtefacts,
  hasActiveSubscriptions
} from "./repository/queries.js";
export { getLocationsGroupedByLetter, type Location, searchLocations } from "./repository/service.js";
export { seedLocationData } from "./seed-data.js";
