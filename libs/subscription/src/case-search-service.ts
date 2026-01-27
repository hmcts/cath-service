import { findByCaseName, findByCaseNumber } from "@hmcts/publication";

export type CaseSearchResult = {
  id: string;
  caseNumber: string | null;
  caseName: string | null;
  artefactId: string;
};

export async function searchByCaseName(caseName: string): Promise<CaseSearchResult[]> {
  if (!caseName || caseName.trim().length === 0) {
    throw new Error("Case name is required");
  }

  const results = await findByCaseName(caseName.trim());

  // Deduplicate by case number and case name (keep most recent artefact)
  const seen = new Map<string, CaseSearchResult>();

  for (const result of results) {
    const key = `${result.caseNumber || ""}|${result.caseName || ""}`;
    if (!seen.has(key)) {
      seen.set(key, {
        id: result.id,
        caseNumber: result.caseNumber,
        caseName: result.caseName,
        artefactId: result.artefactId
      });
    }
  }

  return Array.from(seen.values());
}

export async function searchByCaseReference(reference: string): Promise<CaseSearchResult[]> {
  if (!reference || reference.trim().length === 0) {
    throw new Error("Case reference is required");
  }

  const results = await findByCaseNumber(reference.trim());

  // Deduplicate by case number and case name (keep most recent artefact)
  const seen = new Map<string, CaseSearchResult>();

  for (const result of results) {
    const key = `${result.caseNumber || ""}|${result.caseName || ""}`;
    if (!seen.has(key)) {
      seen.set(key, {
        id: result.id,
        caseNumber: result.caseNumber,
        caseName: result.caseName,
        artefactId: result.artefactId
      });
    }
  }

  return Array.from(seen.values());
}
