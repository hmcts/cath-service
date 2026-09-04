import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPropertiesVolumeSecrets, MonitoringService } from "@hmcts-cft/cloud-native-platform";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chartPath = path.join(__dirname, "../helm/values.yaml");

export const main = async () => {
  await getPropertiesVolumeSecrets({ chartPath, omit: ["DATABASE_URL"] });

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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Cron job failed:", error);
    process.exit(1);
  });
}
