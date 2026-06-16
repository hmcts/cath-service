export enum Provenance {
  MANUAL_UPLOAD = "MANUAL_UPLOAD",
  SNL = "SNL",
  COMMON_PLATFORM = "COMMON_PLATFORM",
  CP_CATH = "CP_CATH",
  PDDA = "PDDA"
}

export const PROVENANCE_LABELS: Record<string, string> = {
  [Provenance.MANUAL_UPLOAD]: "Manual Upload",
  [Provenance.SNL]: "SNL",
  [Provenance.COMMON_PLATFORM]: "Common Platform",
  [Provenance.CP_CATH]: "CP-CaTH",
  [Provenance.PDDA]: "PDDA"
};
