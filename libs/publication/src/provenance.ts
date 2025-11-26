export enum Provenance {
  MANUAL_UPLOAD = "MANUAL_UPLOAD",
  XHIBIT = "XHIBIT",
  SNL = "SNL",
  COMMON_PLATFORM = "COMMON_PLATFORM"
}

export const PROVENANCE_LABELS: Record<string, string> = {
  [Provenance.MANUAL_UPLOAD]: "Manual Upload",
  [Provenance.XHIBIT]: "XHIBIT",
  [Provenance.SNL]: "SNL",
  [Provenance.COMMON_PLATFORM]: "Common Platform"
};
