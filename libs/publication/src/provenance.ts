export enum Provenance {
  MANUAL_UPLOAD = "MANUAL_UPLOAD"
}

export const PROVENANCE_LABELS: Record<string, string> = {
  [Provenance.MANUAL_UPLOAD]: "Manual Upload"
};
