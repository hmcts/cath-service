export enum Provenance {
  MANUAL_UPLOAD = "MANUAL_UPLOAD",
  XHIBIT = "XHIBIT",
  LIBRA = "LIBRA",
  SJP = "SJP"
}

export const PROVENANCE_LABELS: Record<string, string> = {
  [Provenance.MANUAL_UPLOAD]: "Manual Upload",
  [Provenance.XHIBIT]: "XHIBIT",
  [Provenance.LIBRA]: "LIBRA",
  [Provenance.SJP]: "SJP"
};
