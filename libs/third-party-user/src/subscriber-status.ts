export const THIRD_PARTY_USER_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"] as const;

export function isThirdPartyUserStatus(value: unknown): value is ThirdPartyUserStatus {
  return typeof value === "string" && (THIRD_PARTY_USER_STATUSES as readonly string[]).includes(value);
}

export type ThirdPartyUserStatus = (typeof THIRD_PARTY_USER_STATUSES)[number];
