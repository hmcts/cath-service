import { createKeyVaultSecretName, deleteSecrets, setSecret } from "@hmcts/third-party-user";
import type { LegacySecretReader } from "./legacy-secret-source.js";
import type { OauthCredentialSource } from "./oauth-third-party-transform.js";
import type { Rejection, StepReport } from "./sync-report.js";

const STEP_NAME = "third_party_secret";

// Secret values are never logged or returned; only user ids and reasons are reported.
// setSecret writes to THIRD_PARTY_KEY_VAULT, or the local third_party_secret table without one.
export async function copyOauthSecrets(credentials: OauthCredentialSource[], reader: LegacySecretReader | undefined, isDryRun: boolean): Promise<StepReport> {
  if (!reader) {
    return { name: STEP_NAME, processed: 0, rejections: [], skipped: "LEGACY_THIRD_PARTY_KEY_VAULT is not set" };
  }

  const rejections: Rejection[] = [];
  let processed = 0;

  for (const credential of credentials) {
    const legacyValues = await readLegacyValues(credential, reader);

    if (!legacyValues) {
      rejections.push({ entityId: credential.userId, reason: "OAuth secret missing from the legacy vault" });
      continue;
    }

    if (!isDryRun) {
      const values = { ...legacyValues, "destination-url": credential.destinationUrl, "token-url": credential.tokenUrl };
      for (const [type, value] of Object.entries(values) as [SecretType, string][]) {
        await setSecret(createKeyVaultSecretName(credential.userId, type), value);
      }
    }
    processed++;
  }

  return { name: STEP_NAME, processed, rejections };
}

export async function deleteRemovedOauthSecrets(previousUserIds: string[], keptUserIds: string[]): Promise<void> {
  const kept = new Set(keptUserIds);
  for (const userId of previousUserIds.filter((id) => !kept.has(id))) {
    await deleteSecrets(userId);
  }
}

async function readLegacyValues(credential: OauthCredentialSource, reader: LegacySecretReader) {
  const clientId = await reader.read(credential.legacySecretNames["client-id"]);
  const clientSecret = await reader.read(credential.legacySecretNames["client-secret"]);
  const scope = await reader.read(credential.legacySecretNames.scope);

  if (!clientId || !clientSecret || !scope) return null;
  return { "client-id": clientId, "client-secret": clientSecret, scope };
}

type SecretType = Parameters<typeof createKeyVaultSecretName>[1];
