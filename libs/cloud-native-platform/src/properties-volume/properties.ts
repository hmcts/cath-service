import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { addFromAzureVault } from "./azure-vault.js";

export interface GetSecretsOptions {
  mountPoint?: string;
  failOnError?: boolean;
  injectEnvVars?: boolean;
  chartPath?: string;
  omit?: string[];
}

export type Secrets = Record<string, string>;

export interface Config {
  [key: string]: any;
}

const DEFAULT_MOUNT_POINT = "/mnt/secrets";

export async function getPropertiesVolumeSecrets(options: GetSecretsOptions = {}): Promise<Secrets> {
  const isProd = process.env.NODE_ENV === "production";
  const { mountPoint = DEFAULT_MOUNT_POINT, failOnError = isProd, injectEnvVars = true, chartPath, omit } = options;

  const secrets: Secrets = {};

  try {
    if (existsSync(mountPoint)) {
      const entries = readdirSync(mountPoint, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith("..")) continue;

        const entryPath = join(mountPoint, entry.name);

        if (entry.isDirectory() || entry.isSymbolicLink?.()) {
          const vaultSecrets = readSecretsFromDirectory(entryPath, entry.name, failOnError);
          Object.assign(secrets, vaultSecrets);
        } else {
          const secret = readSecretFile(entryPath, entry.name, failOnError);
          if (secret) {
            Object.assign(secrets, secret);
          }
        }
      }
    } else {
      const message = `Mount point ${mountPoint} does not exist`;
      if (failOnError) {
        throw new Error(message);
      }
      console.warn(`Warning: ${message}`);
    }

    if (injectEnvVars) {
      for (const [key, value] of Object.entries(secrets)) {
        process.env[key] = value;
      }
    }

    if (chartPath) {
      await loadFromAzureVault(secrets, chartPath, injectEnvVars, omit);
    }
  } catch (error: any) {
    const errorMessage = error.message || error;
    if (failOnError) {
      throw new Error(errorMessage);
    }
    console.warn(`Warning: ${errorMessage}`);
  }

  return secrets;
}

async function loadFromAzureVault(secrets: Secrets, chartPath: string, injectEnvVars: boolean, omit?: string[]): Promise<void> {
  if (!existsSync(chartPath)) return;

  const isProd = process.env.NODE_ENV === "production";
  if (isProd) return;

  console.log("Azure Vault: Loading secrets from Key Vault (requires 'az login')");
  const config: Record<string, any> = {};
  await addFromAzureVault(config, { pathToHelmChart: chartPath });

  for (const [key, value] of Object.entries(config)) {
    if (shouldOmit(key, omit)) continue;

    secrets[key] = String(value);
    if (injectEnvVars) {
      process.env[key] = String(value);
    }
  }
}

function readSecretsFromDirectory(dirPath: string, vaultName: string, failOnError: boolean): Secrets {
  const secrets: Secrets = {};

  try {
    const files = readdirSync(dirPath);

    for (const file of files) {
      if (file.startsWith("..")) continue;

      const secret = readSecretFile(join(dirPath, file), file, failOnError);
      if (secret) {
        const key = `${vaultName}.${file}`;
        secrets[key] = Object.values(secret)[0];

        // Also set without prefix for env var injection
        secrets[file] = Object.values(secret)[0];
      }
    }
  } catch (error) {
    const message = `Failed to read vault directory ${dirPath}: ${error}`;
    if (failOnError) {
      throw new Error(message);
    }
    console.warn(`Warning: ${message}`);
  }

  return secrets;
}

function readSecretFile(filePath: string, name: string, failOnError: boolean): Secrets | null {
  try {
    const content = readFileSync(filePath, "utf8").trim();
    return { [name]: content };
  } catch (error) {
    const message = `Failed to read secret file ${filePath}: ${error}`;
    if (failOnError) {
      throw new Error(message);
    }
    console.warn(`Warning: ${message}`);
    return null;
  }
}

function shouldOmit(key: string, omit?: string[]): boolean {
  if (!omit || omit.length === 0) return false;
  return omit.includes(key);
}
