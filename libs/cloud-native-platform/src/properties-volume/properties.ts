import fs, { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { addFromAzureVault } from "./azure-vault.js";
import { deepMerge } from "./utils.js";

export interface AddToOptions {
  mountPoint?: string;
  failOnError?: boolean;
  chartPath?: string;
}

export interface Config {
  [key: string]: any;
}

const DEFAULT_MOUNT_POINT = "/mnt/secrets";

/**
 * Adds properties from mounted volume to configuration object
 * Matches the API of @hmcts/properties-volume addTo function
 */
export async function configurePropertiesVolume(config: Config, options: AddToOptions = {}): Promise<void> {
  const isProd = process.env.NODE_ENV === "production";
  const { mountPoint = DEFAULT_MOUNT_POINT, failOnError = isProd, chartPath } = options;

  // Detect if running in Azure/Kubernetes environment (separate from Key Vault toggle)
  const isAzureEnvironment = existsSync(mountPoint) || !!process.env.KUBERNETES_SERVICE_HOST;

  // Toggle for Azure Key Vault - can be enabled locally for testing
  const enableAzureKeyVault = process.env.AZURE_KEYVAULT_TEST_MODE === "true";

  // Decide whether to load from Key Vault (either in Azure OR explicitly enabled locally)
  const shouldLoadFromKeyVault = isAzureEnvironment || enableAzureKeyVault;

  // Optional: Allow forcing values.yaml locally (defaults to using values.dev.yaml when local)
  const useDevValues = process.env.USE_HELM_DEV_VALUES !== "false";

  // Strict mode: Fail fast if Key Vault loading fails (no fallback to .env)
  // Useful for testing that the correct Helm values file is being used
  const strictMode = process.env.STRICT_KEY_VAULT_MODE === "true";
  const shouldFailOnError = failOnError || (strictMode && shouldLoadFromKeyVault);

  try {
    // Determine which Helm chart to use
    let helmChartPath = chartPath;

    // When running locally (not in Azure), prefer values.dev.yaml if it exists
    if (chartPath && !isAzureEnvironment && useDevValues) {
      const devChartPath = chartPath.replace(/values\.yaml$/, "values.dev.yaml");
      if (fs.existsSync(devChartPath)) {
        helmChartPath = devChartPath;
        console.log(`Using local development values (${devChartPath.split("/").pop()})`);
      }
    }

    // Load from Azure Key Vault when in Azure environment or explicitly enabled
    if (helmChartPath && shouldLoadFromKeyVault && fs.existsSync(helmChartPath)) {
      if (enableAzureKeyVault && !isAzureEnvironment) {
        const modeMessage = strictMode ? " [STRICT MODE: Will fail if secrets missing]" : "";
        console.log(`Azure Vault: ENABLED (AZURE_KEYVAULT_TEST_MODE=true) - Loading secrets from Azure Key Vault${modeMessage}`);
      } else {
        console.log("Azure Vault: Running in Kubernetes/Azure environment - Loading secrets from mounted Key Vault");
      }
      return await addFromAzureVault(config, { pathToHelmChart: helmChartPath });
    }

    if (helmChartPath && !shouldLoadFromKeyVault) {
      console.log("Azure Vault: DISABLED (AZURE_KEYVAULT_TEST_MODE not set) - Using .env file only");
    }

    if (!existsSync(mountPoint)) {
      const message = `Mount point ${mountPoint} does not exist`;
      if (shouldFailOnError) {
        throw new Error(message);
      }
      console.warn(`Warning: ${message}`);
      return;
    }

    const files = readdirSync(mountPoint);
    const properties: Config = {};

    for (const file of files) {
      const filePath = join(mountPoint, file);

      try {
        const content = readFileSync(filePath, "utf8").trim();

        // Use filename as property key, content as value
        properties[file] = content;
      } catch (error) {
        const message = `Failed to read property file ${filePath}: ${error}`;
        if (shouldFailOnError) {
          throw new Error(message);
        }
        console.warn(`Warning: ${message}`);
      }
    }

    // Merge properties into the configuration object
    Object.assign(config, deepMerge(config, properties));
  } catch (error: any) {
    // Extract cleaner error message
    const errorMessage = error.message || error;
    const cleanMessage = errorMessage.includes("Azure Key Vault:") ? errorMessage : `Failed to load properties from ${mountPoint}: ${errorMessage}`;

    if (shouldFailOnError) {
      throw new Error(cleanMessage);
    }
    console.warn(`Warning: ${cleanMessage}`);
  }
}
