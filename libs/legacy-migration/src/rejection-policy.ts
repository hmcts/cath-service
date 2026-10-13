// Every run reloads the full legacy snapshot, so these rejections recur nightly until legacy is
// switched off. Each is a deliberate scope decision or permanent legacy data, so it is reported
// but does not block cutover. Any reason not listed blocks, including reasons added later.
const ACCEPTED_REJECTION_REASONS: RegExp[] = [
  // Third parties are pi_user rows in legacy but sync to the legacy_third_party_* tables.
  /^provenance THIRD_PARTY is not a sign-in user/,
  /^API_COURTEL subscription belongs to a legacy third party$/,
  // Legacy migration V1.16 copied CASE_ID and CASE_URN rows to CASE_NUMBER without deleting the originals.
  /^duplicate of an older subscription after search type mapping$/,
  // third_party_user has no status column, so only ACTIVE subscribers are migrated, and their
  // subscriptions go with them. Unlike "user not migrated", the parent rejection is always accepted.
  /^status (PENDING|SUSPENDED) is not migrated$/,
  /^third party not migrated$/,
  // This service has no INTERNAL sensitivity and publishes lists only.
  /^unsupported sensitivity INTERNAL$/,
  /^artefact type (JUDGEMENTS_AND_OUTCOMES|GENERAL_PUBLICATION) is not supported$/
];

export function isAcceptedRejection(reason: string): boolean {
  return ACCEPTED_REJECTION_REASONS.some((pattern) => pattern.test(reason));
}
