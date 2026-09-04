import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPropertiesVolumeSecrets, MonitoringService } from "@hmcts-cft/cloud-native-platform";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chartPath = path.join(__dirname, "../helm/values.yaml");

export const main = async () => {
  await getPropertiesVolumeSecrets({ chartPath, omit: ["DATABASE_URL"] });

  // Imported after getPropertiesVolumeSecrets() so `config` reads the Key Vault
  // values it sets rather than caching the defaults. Same reason as apps/web/src/app.ts.
  const { default: config } = await import("config");
  const { serviceName, connectionString, enabled } = config.get<{
    serviceName: string;
    connectionString?: string;
    enabled?: boolean;
  }>("applicationInsights");

  // A cron pod exits as soon as its script returns, so telemetry has to be flushed
  // explicitly — the SDK batches and would otherwise drop everything on exit. That
  // is why this runner owns the monitoring lifecycle rather than each script.
  const monitoring = enabled && connectionString ? new MonitoringService(connectionString, serviceName) : undefined;

  const scriptName = process.env.SCRIPT_NAME;
  const startedAt = Date.now();

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

    monitoring?.trackEvent("CronJobSucceeded", { scriptName });
    monitoring?.trackMetric("CronJobDuration", Date.now() - startedAt, { scriptName, outcome: "success" });
  } catch (error) {
    // Tracked here rather than in the caller's catch so the exception reaches
    // Application Insights before the flush below.
    monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
      scriptName,
      outcome: "failure"
    });
    monitoring?.trackMetric("CronJobDuration", Date.now() - startedAt, { scriptName, outcome: "failure" });
    throw error;
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
