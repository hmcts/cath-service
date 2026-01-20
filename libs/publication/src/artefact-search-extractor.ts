import { getConfigForListType } from "@hmcts/list-search-config";
import * as repository from "./repository/queries.js";

export async function extractAndStoreArtefactSearch(artefactId: string, listTypeId: number, jsonPayload: unknown): Promise<void> {
  try {
    const config = await getConfigForListType(listTypeId);

    if (!config) {
      console.log(`[ArtefactSearch] No config found for listTypeId ${listTypeId}`);
      return;
    }

    if (!jsonPayload || typeof jsonPayload !== "object" || Array.isArray(jsonPayload)) {
      console.log(`[ArtefactSearch] Invalid JSON payload for artefact ${artefactId}`);
      return;
    }

    const payload = jsonPayload as Record<string, unknown>;

    const caseNumberValue = payload[config.caseNumberFieldName];
    const caseNumber: string | null = typeof caseNumberValue === "string" ? caseNumberValue : null;

    const caseNameValue = payload[config.caseNameFieldName];
    const caseName: string | null = typeof caseNameValue === "string" ? caseNameValue : null;

    if (!caseNumber && !caseName) {
      console.log(`[ArtefactSearch] No case data found in payload for artefact ${artefactId}`);
      return;
    }

    await repository.createArtefactSearch(artefactId, caseNumber, caseName);

    console.log(`[ArtefactSearch] Extracted case data for artefact ${artefactId}`, {
      caseNumber: caseNumber ? "present" : "null",
      caseName: caseName ? "present" : "null"
    });
  } catch (error) {
    console.error(`[ArtefactSearch] Failed to extract/store for artefact ${artefactId}:`, error);
  }
}
