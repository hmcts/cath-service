import type { DomainTransform, Rejection } from "../sync/sync-report.js";
import type { LegacyArchivedUser } from "./legacy-account-source.js";

// Archived accounts are historical records, so roles, provenances and emails are copied as legacy
// recorded them, including provenances this service does not migrate as users.
export function transformArchivedUsers(legacyArchivedUsers: LegacyArchivedUser[]): DomainTransform<MigratedArchivedUser> {
  const rejections: Rejection[] = [];
  const rows: MigratedArchivedUser[] = [];

  for (const legacy of legacyArchivedUsers) {
    if (!legacy.archived_date) {
      rejections.push({ entityId: legacy.user_id, reason: "missing archived date" });
      continue;
    }

    rows.push({
      userId: legacy.user_id,
      userProvenance: legacy.user_provenance,
      provenanceUserId: legacy.provenance_user_id,
      email: legacy.email,
      roles: legacy.roles,
      lastSignedInDate: legacy.last_signed_in_date,
      archivedDate: legacy.archived_date
    });
  }

  return { rows, rejections };
}

export interface MigratedArchivedUser {
  userId: string;
  userProvenance: string | null;
  provenanceUserId: string | null;
  email: string | null;
  roles: string | null;
  lastSignedInDate: Date | null;
  archivedDate: Date;
}
