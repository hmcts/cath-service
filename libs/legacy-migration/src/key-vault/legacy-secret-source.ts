import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

// Returns undefined when no legacy vault is configured, so the caller can report the
// OAuth secret copy as skipped rather than failing the whole account sync.
export function createLegacySecretReader(): LegacySecretReader | undefined {
  const vaultName = process.env.LEGACY_THIRD_PARTY_KEY_VAULT;
  if (!vaultName) return undefined;

  const credential = new DefaultAzureCredential({ managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID });
  const client = new SecretClient(`https://${vaultName}.vault.azure.net`, credential);

  return {
    async read(secretName) {
      try {
        return (await client.getSecret(secretName)).value;
      } catch {
        return undefined;
      }
    }
  };
}

export interface LegacySecretReader {
  read(secretName: string): Promise<string | undefined>;
}
