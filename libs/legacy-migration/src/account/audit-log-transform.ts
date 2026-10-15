import type { DomainTransform, Rejection } from "../sync/sync-report.js";
import type { LegacyAuditLog } from "./legacy-account-source.js";

// Roles and actions are copied as legacy recorded them: these are historical records,
// so they are not remapped to the names this service uses.
export function transformAuditLogs(legacyLogs: LegacyAuditLog[]): DomainTransform<MigratedAuditLog> {
  const rejections: Rejection[] = [];
  const rows: MigratedAuditLog[] = [];

  for (const legacy of legacyLogs) {
    const { user_id, user_email, roles, user_provenance, action, timestamp } = legacy;

    if (!user_id || !user_email || !roles || !user_provenance || !action || !timestamp) {
      rejections.push({ entityId: legacy.id, reason: "missing a required audit field" });
      continue;
    }

    rows.push({
      id: legacy.id,
      timestamp,
      action,
      details: legacy.details,
      userId: user_id,
      userEmail: user_email,
      userRole: roles,
      userProvenance: user_provenance
    });
  }

  return { rows, rejections };
}

export interface MigratedAuditLog {
  id: string;
  timestamp: Date;
  action: string;
  details: string | null;
  userId: string;
  userEmail: string;
  userRole: string;
  userProvenance: string;
}
