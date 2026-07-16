export { extractAndStoreArtefactSearch } from "./artefact-search-extractor.js";
export { requirePublicationAccess, requirePublicationDataAccess } from "./authorisation/middleware.js";
export {
  canAccessPublication,
  canAccessPublicationData,
  canAccessPublicationMetadata,
  filterAccessiblePublications,
  filterPublicationsForSummary,
  type ListType,
  resolveListType
} from "./authorisation/service.js";
export { getContentTypeFromExtension } from "./file-storage/content-type.js";
export { getContentType, getFileBuffer, getFileExtension, getFileName, getPublicationJson, getSourceArtefactId } from "./file-storage/file-retrieval.js";
export { Language } from "./language.js";
export { mockPublications, type Publication } from "./mock-publications.js";
export { generatePublicationPdf, processPublication, sendPublicationNotificationsForArtefact } from "./processing/service.js";
export { PROVENANCE_LABELS, Provenance } from "./provenance.js";
export {
  createArtefactSearch,
  deleteArtefactSearchByArtefactId,
  findArtefactSearchByArtefactId
} from "./repository/artefact-search-queries.js";
export type { Artefact, ArtefactWithListType } from "./repository/model.js";
export {
  type ArtefactMetadata,
  type ArtefactSummary,
  createArtefact,
  deleteArtefacts,
  getArtefactById,
  getArtefactListTypeId,
  getArtefactMetadata,
  getArtefactSummariesByLocation,
  getArtefactsByIds,
  getArtefactsByLocation,
  getArtefactType,
  getLatestSjpArtefacts,
  getLocationsWithPublicationCount,
  type LocationWithPublicationCount,
  updateSourceArtefactId
} from "./repository/queries.js";
export { getFlatFileUrl, getJsonContent, getRenderedTemplateUrl } from "./repository/service.js";
export { Sensitivity } from "./sensitivity.js";
export {
  type ValidationResult,
  validateJson
} from "./validation/json-validator.js";
