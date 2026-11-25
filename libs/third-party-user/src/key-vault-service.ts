import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { prisma } from "@hmcts/postgres-prisma";

function createSecretClient(): SecretClient | undefined {
  const vaultName = process.env.THIRD_PARTY_KEY_VAULT;
  if (!vaultName) return undefined;
  const credential = new DefaultAzureCredential({ managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID });
  return new SecretClient(`https://${vaultName}.vault.azure.net`, credential);
}

// Legacy ThirdPartyHelper.createSecretKeyPrefix: Key Vault secret names only allow alphanumerics and hyphens
export function createKeyVaultSecretName(name: string, userId: string, type: SecretType): string {
  const prefix = `${name}-${userId}-`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "");
  return `${prefix}${type}`;
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

export async function deleteSecrets(name: string, userId: string): Promise<void> {
  const secretTypes: SecretType[] = ["destination-url", "token-url", "scope", "client-id", "client-secret"];
  const client = createSecretClient();
  await Promise.all(
    secretTypes.map(async (type) => {
      const secretName = createKeyVaultSecretName(name, userId, type);
      if (!client) {
        await prisma.thirdPartySecret.deleteMany({ where: { name: secretName } });
        return;
      }
      try {
        await client.beginDeleteSecret(secretName);
      } catch {
        // secret may not exist — ignore
      }
    })
  );
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

type SecretType = "scope" | "client-id" | "client-secret" | "destination-url" | "token-url";
