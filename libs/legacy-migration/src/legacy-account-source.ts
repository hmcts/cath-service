import pg from "pg";

// Legacy deletes audit entries older than this (AuditService, hard-coded), so this is all there is.
const AUDIT_LOG_RETENTION_DAYS = 90;

export async function readLegacyAccountData(connectionString: string): Promise<LegacyAccountData> {
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    // Legacy timestamps are UTC LocalDateTimes in "timestamp without time zone" columns;
    // AT TIME ZONE 'UTC' stops pg parsing them in the pod's local zone.
    // A read-only, repeatable-read snapshot so every table is consistent with the others
    // even while legacy keeps taking writes.
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");

    const users = await client.query<LegacyUser>(
      `SELECT user_id, user_provenance, provenance_user_id, email, roles, forenames, surname,
              created_date AT TIME ZONE 'UTC' AS created_date,
              last_signed_in_date AT TIME ZONE 'UTC' AS last_signed_in_date,
              last_verified_date AT TIME ZONE 'UTC' AS last_verified_date
         FROM pi_user`
    );
    const subscriptions = await client.query<LegacySubscription>(
      `SELECT id, user_id, search_type, search_value, channel, case_number, case_name,
              created_date AT TIME ZONE 'UTC' AS created_date
         FROM subscription`
    );
    const listTypeSubscriptions = await client.query<LegacyListTypeSubscription>("SELECT id, user_id, list_type, list_language FROM subscription_list_type");
    // Approved and rejected applications have already lost their proof of ID and are purged by legacy.
    const mediaApplications = await client.query<LegacyMediaApplication>(
      `SELECT id, full_name, email, employer, image, image_name,
              request_date AT TIME ZONE 'UTC' AS request_date
         FROM media_application
        WHERE status = 'PENDING'`
    );
    const auditLogs = await client.query<LegacyAuditLog>(
      `SELECT id, user_id, user_email, roles, user_provenance, action, details,
              "timestamp" AT TIME ZONE 'UTC' AS "timestamp"
         FROM audit_log
        WHERE "timestamp" >= (now() AT TIME ZONE 'UTC') - make_interval(days => $1)`,
      [AUDIT_LOG_RETENTION_DAYS]
    );
    const apiUsers = await client.query<LegacyApiUser>("SELECT user_id, name, status, created_date AT TIME ZONE 'UTC' AS created_date FROM api_user");
    const apiSubscriptions = await client.query<LegacyApiSubscription>("SELECT id, user_id, list_type, sensitivity FROM api_subscription");
    const apiOauthConfigurations = await client.query<LegacyApiOauthConfiguration>(
      "SELECT user_id, destination_url, token_url, client_id_key, client_secret_key, scope_key FROM api_oauth_configuration"
    );

    await client.query("COMMIT");

    return {
      users: users.rows,
      subscriptions: subscriptions.rows,
      listTypeSubscriptions: listTypeSubscriptions.rows,
      mediaApplications: mediaApplications.rows,
      auditLogs: auditLogs.rows,
      apiUsers: apiUsers.rows,
      apiSubscriptions: apiSubscriptions.rows,
      apiOauthConfigurations: apiOauthConfigurations.rows
    };
  } finally {
    await client.end();
  }
}

export interface LegacyUser {
  user_id: string;
  user_provenance: string | null;
  provenance_user_id: string;
  email: string | null;
  roles: string | null;
  forenames: string | null;
  surname: string | null;
  created_date: Date | null;
  last_signed_in_date: Date | null;
  last_verified_date: Date | null;
}

export interface LegacySubscription {
  id: string;
  user_id: string;
  search_type: string;
  search_value: string;
  channel: string | null;
  case_number: string | null;
  case_name: string | null;
  created_date: Date | null;
}

export interface LegacyListTypeSubscription {
  id: string;
  user_id: string;
  list_type: string[] | null;
  list_language: string[] | null;
}

export interface LegacyMediaApplication {
  id: string;
  full_name: string | null;
  email: string | null;
  employer: string | null;
  // Blob name of the proof of ID in the legacy files container.
  image: string | null;
  image_name: string | null;
  request_date: Date | null;
}

export interface LegacyAuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  roles: string | null;
  user_provenance: string | null;
  action: string | null;
  details: string | null;
  timestamp: Date | null;
}

export interface LegacyApiUser {
  user_id: string;
  name: string | null;
  status: string | null;
  created_date: Date | null;
}

export interface LegacyApiSubscription {
  id: string;
  user_id: string;
  list_type: string | null;
  sensitivity: string | null;
}

export interface LegacyApiOauthConfiguration {
  user_id: string;
  destination_url: string | null;
  token_url: string | null;
  // Names of secrets in the legacy vault, not the values.
  client_id_key: string | null;
  client_secret_key: string | null;
  scope_key: string | null;
}

export interface LegacyAccountData {
  users: LegacyUser[];
  subscriptions: LegacySubscription[];
  listTypeSubscriptions: LegacyListTypeSubscription[];
  mediaApplications: LegacyMediaApplication[];
  auditLogs: LegacyAuditLog[];
  apiUsers: LegacyApiUser[];
  apiSubscriptions: LegacyApiSubscription[];
  apiOauthConfigurations: LegacyApiOauthConfiguration[];
}
