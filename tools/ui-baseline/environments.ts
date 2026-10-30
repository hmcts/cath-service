import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import type { StorageSpec } from "@hmcts/ui-baseline";

// The environment a check targets (environments.json): where CaTH and pip run, how to sign in to
// CaTH, and where each keeps the files it generates. UI_BASELINE_ENV picks one when no --env is given.
const PARITY_DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLICATIONS_CONTAINER = "publications";

export async function loadEnvironment(name = process.env.UI_BASELINE_ENV ?? "local"): Promise<Environment> {
  const environments = JSON.parse(await readFile(path.join(PARITY_DIR, "environments.json"), "utf-8")) as Record<string, EnvironmentConfig>;
  const config = environments[name];
  if (!config || name.startsWith("$"))
    throw new Error(
      `no environment "${name}" in environments.json (one of: ${Object.keys(environments)
        .filter((key) => !key.startsWith("$"))
        .join(", ")})`
    );
  return { name, cath: config.cath, pip: config.pip, secret: secretReader() };
}

// Where an app's generated files are: an override in <APP>_STORAGE_CONNECTION_STRING (e.g. a key
// copied from a vault), else the environment's connection string or account
export function filesStorage(app: "cath" | "pip", config: AppConfig, container = PUBLICATIONS_CONTAINER): StorageSpec {
  const override = process.env[`${app.toUpperCase()}_STORAGE_CONNECTION_STRING`];
  const connectionString =
    override ?? config.storage.connectionString ?? (config.storage.connectionStringEnv ? process.env[config.storage.connectionStringEnv] : undefined);
  if (!connectionString && !config.storage.accountName)
    throw new Error(`no storage for ${app}: set ${config.storage.connectionStringEnv ?? `${app.toUpperCase()}_STORAGE_CONNECTION_STRING`}`);
  return { connectionString, accountName: config.storage.accountName, container };
}

function secretReader(): SecretReader {
  const clients = new Map<string, SecretClient>();
  const credential = new DefaultAzureCredential();
  return async (config, name) => {
    const fromEnv = process.env[name.toUpperCase().replace(/-/g, "_")];
    if (fromEnv) return fromEnv;
    if (!config.keyVault) return null;
    const client = clients.get(config.keyVault) ?? new SecretClient(`https://${config.keyVault}.vault.azure.net`, credential);
    clients.set(config.keyVault, client);
    try {
      return (await client.getSecret(name)).value ?? null;
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) return null;
      throw error;
    }
  };
}

export interface Environment {
  name: string;
  cath: CathConfig;
  pip: AppConfig;
  // A secret by its vault name, or null when the vault does not have it
  secret: SecretReader;
}

type SecretReader = (config: AppConfig, name: string) => Promise<string | null>;

interface EnvironmentConfig {
  cath: CathConfig;
  pip: AppConfig;
}

export interface AppConfig {
  // Where people use the app; pip's is only for linking to its pages
  baseUrl?: string;
  keyVault?: string;
  storage: { connectionString?: string; connectionStringEnv?: string; accountName?: string };
  dataManagementUrl?: string;
}

export interface CathConfig extends AppConfig {
  baseUrl: string;
  apiUrl: string;
  signIn: "session" | "accounts";
  // CaTH role -> the vault secrets holding a test account with it, and the sign-in flow it uses
  accounts?: Record<string, TestAccount>;
  publicationApi?: { tenantId: string; clientId: string; clientSecret: string };
  filesWaitSeconds: number;
}

export interface TestAccount {
  flow: "sso" | "crime" | "cft";
  user: string;
  password: string;
}
