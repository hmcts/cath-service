export const IS_MAGISTRATES_MEDIA_PROTOCOL = "is_magistrates_media_protocol";
export const IS_NOT_MAGISTRATES_MEDIA_PROTOCOL = "is_not_magistrates_media_protocol";

const MAGISTRATES_LIST_TYPE_NAMES: ReadonlySet<string> = new Set([
  "MAGISTRATES_PUBLIC_LIST",
  "MAGISTRATES_STANDARD_LIST",
  "MAGISTRATES_ADULT_COURT_LIST_DAILY",
  "MAGISTRATES_ADULT_COURT_LIST_FUTURE",
  "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY",
  "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE"
]);

export function isMagistratesMediaProtocol(listTypeName: string | null | undefined): boolean {
  return !!listTypeName && MAGISTRATES_LIST_TYPE_NAMES.has(listTypeName);
}

export function isNotMagistratesMediaProtocol(listTypeName: string | null | undefined): boolean {
  return !isMagistratesMediaProtocol(listTypeName);
}
