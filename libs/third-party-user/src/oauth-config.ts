import { createKeyVaultSecretName, getSecret } from "./key-vault-service.js";

export async function getOauthConfig(userId: string): Promise<OauthConfig | undefined> {
  const [destinationUrl, tokenUrl, scope, clientId, clientSecret] = await Promise.all([
    getSecret(createKeyVaultSecretName(userId, "destination-url")),
    getSecret(createKeyVaultSecretName(userId, "token-url")),
    getSecret(createKeyVaultSecretName(userId, "scope")),
    getSecret(createKeyVaultSecretName(userId, "client-id")),
    getSecret(createKeyVaultSecretName(userId, "client-secret"))
  ]);

  if (!destinationUrl?.trim() || !tokenUrl?.trim() || !scope?.trim() || !clientId?.trim() || !clientSecret?.trim()) {
    return undefined;
  }

  return { destinationUrl, tokenUrl, scope, clientId, clientSecret };
}

export interface OauthConfig {
  destinationUrl: string;
  tokenUrl: string;
  scope: string;
  clientId: string;
  clientSecret: string;
}
