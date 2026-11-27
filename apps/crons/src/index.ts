import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPropertiesVolumeSecrets, MonitoringService } from "@hmcts-cft/cloud-native-platform";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chartPath = path.join(__dirname, "../helm/values.yaml");

export const main = async () => {
  await getPropertiesVolumeSecrets({ chartPath, omit: ["DATABASE_URL", ...localEnvOverrides()] });

  const { default: config } = await import("config");
  const { serviceName, connectionString, enabled } = config.get<{
    serviceName: string;
    connectionString?: string;
    enabled?: boolean;
  }>("applicationInsights");

  const monitoring = enabled && connectionString ? new MonitoringService(connectionString, serviceName) : undefined;

  const scriptName = process.env.SCRIPT_NAME;

  try {
    if (!scriptName) {
      throw new Error("SCRIPT_NAME environment variable is required");
    }

    const script = await import(`./${scriptName}.js`);

    if (script && typeof script.default === "function") {
      await script.default();
    } else {
      throw new Error(`The script "${scriptName}" does not export a default function.`);
    }
  } finally {
    await monitoring?.flush();
  }
};

// Off-cluster the library loads the real Key Vault; values already set locally must win, or a local
// expired-artefacts run would delete blobs in a shared storage account.
function localEnvOverrides(): string[] {
  if (process.env.NODE_ENV === "production") return [];
  return Object.entries(process.env)
    .filter(([, value]) => value !== undefined && value.trim() !== "")
    .map(([key]) => key);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Cron job failed:", error);
    process.exit(1);
  });
}
