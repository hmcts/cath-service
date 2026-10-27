import { createKeyVaultSecretName, getSecret } from "@hmcts/third-party-user";

export async function getDestinationUrl(userId: string): Promise<string | null> {
  const secrets = await readSecrets(userId, ["destination-url"]);
  return secrets?.[0] ?? null;
}

// Legacy reads the client credentials only when a new token has to be requested, not on every push
export async function getTokenCredentials(userId: string): Promise<TokenCredentials | null> {
  const secrets = await readSecrets(userId, ["token-url", "scope", "client-id", "client-secret"]);
  if (!secrets) {
    return null;
  }

  const [tokenUrl, scope, clientId, clientSecret] = secrets;
  return { tokenUrl, scope, clientId, clientSecret };
}

async function readSecrets(userId: string, types: SecretType[]): Promise<string[] | null> {
  try {
    const values = await Promise.all(types.map((type) => getSecret(createKeyVaultSecretName(userId, type))));
    return values.every((value) => !!value) ? (values as string[]) : null;
  } catch {
    return null;
  }
}

type SecretType = Parameters<typeof createKeyVaultSecretName>[1];

export interface TokenCredentials {
  tokenUrl: string;
  scope: string;
  clientId: string;
  clientSecret: string;
}
