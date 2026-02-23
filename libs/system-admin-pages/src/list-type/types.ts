import type { Session } from "express-session";

export interface ListTypeFormData {
  name: string;
  friendlyName: string;
  welshFriendlyName: string;
  shortenedFriendlyName: string;
  url: string;
  defaultSensitivity: string;
  allowedProvenance: string[];
  isNonStrategic: boolean;
  subJurisdictionIds: number[];
  editId?: number;
}

export interface ListTypeSession extends Session {
  configureListType?: Partial<ListTypeFormData>;
}
