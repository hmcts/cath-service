import { createKeyVaultSecretName, getSecret } from "./key-vault-service.js";

export async function getOauthConfig(name: string, userId: string): Promise<OauthConfig | undefined> {
  const [destinationUrl, tokenUrl, scope, clientId, clientSecret] = await Promise.all([
    getSecret(createKeyVaultSecretName(name, userId, "destination-url")),
    getSecret(createKeyVaultSecretName(name, userId, "token-url")),
    getSecret(createKeyVaultSecretName(name, userId, "scope")),
    getSecret(createKeyVaultSecretName(name, userId, "client-id")),
    getSecret(createKeyVaultSecretName(name, userId, "client-secret"))
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
