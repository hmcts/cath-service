import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { prisma } from "@hmcts/postgres-prisma";

function createSecretClient(): SecretClient | undefined {
  const vaultName = process.env.THIRD_PARTY_KEY_VAULT;
  if (!vaultName) return undefined;
  const credential = new DefaultAzureCredential({ managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID });
  return new SecretClient(`https://${vaultName}.vault.azure.net`, credential);
}

export function createKeyVaultSecretName(userId: string, type: "scope" | "client-id" | "client-secret" | "destination-url" | "token-url"): string {
  return `third-party-${userId}-${type}`;
}

export async function getSecret(secretName: string): Promise<string | undefined> {
  const client = createSecretClient();
  if (!client) {
    const record = await prisma.thirdPartySecret.findUnique({ where: { name: secretName } });
    return record?.value ?? undefined;
  }
  try {
    const secret = await client.getSecret(secretName);
    return secret.value;
  } catch {
    return undefined;
  }
}

export async function setSecret(secretName: string, value: string): Promise<void> {
  const client = createSecretClient();
  if (!client) {
    await prisma.thirdPartySecret.upsert({
      where: { name: secretName },
      update: { value },
      create: { name: secretName, value }
    });
    return;
  }
  await client.setSecret(secretName, value);
}
