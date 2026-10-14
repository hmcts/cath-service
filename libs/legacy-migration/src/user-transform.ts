import type { LegacyUser } from "./legacy-account-source.js";
import type { DomainTransform, Rejection } from "./sync-report.js";
import { isUserProvenance, mapProvenanceUserId, mapRole, normaliseEmail } from "./value-mapping.js";

export function transformUsers(legacyUsers: LegacyUser[]): DomainTransform<MigratedUser> {
  const rejections: Rejection[] = [];
  const seenProvenanceIds = new Set<string>();
  const rows: MigratedUser[] = [];

  for (const legacyUser of legacyUsers) {
    const result = transformUser(legacyUser);
    if (!result.ok) {
      rejections.push({ entityId: legacyUser.user_id, reason: result.reason });
    } else if (seenProvenanceIds.has(result.user.userProvenanceId)) {
      rejections.push({ entityId: legacyUser.user_id, reason: "duplicate provenance_user_id in legacy" });
    } else {
      seenProvenanceIds.add(result.user.userProvenanceId);
      rows.push(result.user);
    }
  }

  return { rows, rejections };
}

function transformUser(legacy: LegacyUser): TransformResult {
  if (!isUserProvenance(legacy.user_provenance)) {
    return { ok: false, reason: `provenance ${legacy.user_provenance} is not a sign-in user (third parties sync separately)` };
  }

  const email = normaliseEmail(legacy.email);
  if (!email) {
    return { ok: false, reason: "missing email" };
  }

  const role = mapRole(legacy.roles);
  if (!role) {
    return { ok: false, reason: `unmapped role ${legacy.roles}` };
  }

  const provenance = legacy.user_provenance as string;

  return {
    ok: true,
    user: {
      userId: legacy.user_id,
      email,
      firstName: legacy.forenames,
      surname: legacy.surname,
      userProvenance: provenance,
      userProvenanceId: mapProvenanceUserId(provenance, legacy.provenance_user_id),
      role,
      // A fixed fallback keeps rows stable between runs and makes missing legacy dates easy to find.
      createdDate: legacy.created_date ?? new Date(0),
      lastSignedInDate: legacy.last_signed_in_date,
      lastVerifiedDate: legacy.last_verified_date,
      isLegacyMigrated: true
    }
  };
}

export interface MigratedUser {
  userId: string;
  email: string;
  firstName: string | null;
  surname: string | null;
  userProvenance: string;
  userProvenanceId: string;
  role: string;
  createdDate: Date;
  lastSignedInDate: Date | null;
  lastVerifiedDate: Date | null;
  isLegacyMigrated: true;
}

type TransformResult = { ok: true; user: MigratedUser } | { ok: false; reason: string };
