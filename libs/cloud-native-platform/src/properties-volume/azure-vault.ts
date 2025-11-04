import { readFileSync } from "node:fs";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { load as yamlLoad } from "js-yaml";
import type { Config } from "./properties.js";
import { deepMerge, deepSearch, normalizeSecretName } from "./utils.js";

export interface AzureVaultOptions {
  pathToHelmChart: string;
}

export interface StructuredSecret {
  alias: string;
  name: string;
}

export type StructuredOrUnstructuredSecret = string | StructuredSecret;

/**
 * Adds secrets from Azure Key Vault to configuration object
 * Matches the API of @hmcts/properties-volume addFromAzureVault function
 */
export async function addFromAzureVault(config: Config, options: AzureVaultOptions): Promise<void> {
  const { pathToHelmChart } = options;

  try {
    // Load and parse Helm chart YAML
    const helmChartContent = readFileSync(pathToHelmChart, "utf8");
    const helmChart = yamlLoad(helmChartContent) as any;

    // Find all keyVaults in the Helm chart
    const keyVaults = deepSearch(helmChart, "keyVaults");

    if (!keyVaults.length) {
      console.warn("Azure Vault: No keyVaults found in Helm chart");
      return;
    }

    // Process each keyVaults object found
    for (const keyVaultsObj of keyVaults) {
      if (keyVaultsObj && typeof keyVaultsObj === "object") {
        // keyVaultsObj should be an object with vault names as keys
        for (const [vaultName, vaultConfig] of Object.entries(keyVaultsObj)) {
          const vault = { name: vaultName };
          if (vaultConfig && typeof vaultConfig === "object") {
            Object.assign(vault, vaultConfig);
          }
          await processVault(config, vault);
        }
      }
    }
  } catch (error: any) {
    // Provide cleaner error message
    const message = error.message || error;
    throw new Error(`Azure Key Vault: ${message}`);
  }
}

/**
 * Process a single vault configuration
 */
async function processVault(config: Config, vault: any): Promise<void> {
  const { name: vaultName, secrets } = vault;

  if (!vaultName || !secrets) {
    console.warn("Azure Vault: Invalid vault configuration, missing name or secrets");
    return;
  }

  console.log(`Azure Vault: Connecting to ${vaultName}...`);

  // Use vault name as-is from Helm chart (should include environment suffix like -stg, -aat, etc.)
  const vaultUri = `https://${vaultName}.vault.azure.net/`;

  // Use DefaultAzureCredential with a shorter timeout for local development
  // AZURE_TENANT_ID should be set to prioritize Azure CLI authentication
  const credential = new DefaultAzureCredential();
  const client = new SecretClient(vaultUri, credential);

  console.log(`Azure Vault: Fetching ${secrets.length} secrets from ${vaultName}...`);
  const secretPromises = secrets.map((secret: StructuredOrUnstructuredSecret) => processSecret(client, secret));

  try {
    const TIMEOUT_MS = 30000; // 30 second timeout
    const secretResults = await Promise.race([
      Promise.all(secretPromises),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT_MS}ms while fetching secrets from ${vaultName}`)), TIMEOUT_MS)
      )
    ]);

    // Merge all secrets into config
    const secretsConfig: Config = {};
    for (const { key, value } of secretResults) {
      secretsConfig[key] = value;
      // Set environment variable so code reading from process.env gets the Key Vault value
      process.env[key] = value;
    }

    Object.assign(config, deepMerge(config, secretsConfig));
    console.log(`Azure Vault: Successfully loaded ${secretResults.length} secrets from ${vaultName}`);
  } catch (error: any) {
    // Re-throw with vault context if not already included
    if (error.message && !error.message.includes(vaultName)) {
      throw new Error(`Vault '${vaultName}': ${error.message}`);
    }
    throw error;
  }
}

/**
 * Process a single secret from the vault
 */
async function processSecret(client: SecretClient, secret: StructuredOrUnstructuredSecret): Promise<{ key: string; value: string }> {
  let secretName: string;
  let configKey: string;

  if (typeof secret === "string") {
    secretName = secret;
    configKey = normalizeSecretName(secret);
  } else {
    secretName = secret.name;
    configKey = secret.alias || normalizeSecretName(secret.name);
  }

  try {
    const secretResponse = await client.getSecret(secretName);

    if (!secretResponse.value) {
      throw new Error(`Secret ${secretName} has no value`);
    }

    return {
      key: configKey,
      value: secretResponse.value
    };
  } catch (error: any) {
    // Extract cleaner error message for common Azure Key Vault issues
    if (error?.statusCode === 403 || error?.message?.includes("does not have secrets get permission")) {
      throw new Error(`Could not load secret '${secretName}'. Check it exists and you have access to it.`);
    }
    if (error?.code === "SecretNotFound" || error?.message?.includes("was not found")) {
      throw new Error(`Secret '${secretName}' does not exist in the vault`);
    }
    throw new Error(`Failed to retrieve secret ${secretName}: ${error.message || error}`);
  }
}
