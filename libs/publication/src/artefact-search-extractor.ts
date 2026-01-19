import { getConfigForListType } from "@hmcts/list-search-config";
import * as repository from "./artefact-search-repository.js";

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

    const caseNumber = typeof payload[config.caseNumberFieldName] === "string" ? payload[config.caseNumberFieldName] : null;
    const caseName = typeof payload[config.caseNameFieldName] === "string" ? payload[config.caseNameFieldName] : null;

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
