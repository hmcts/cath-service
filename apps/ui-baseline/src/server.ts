import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baselineContainer, latestBaseline, pullBaseline } from "@hmcts/ui-baseline/baseline-store";
import { loadEnvironment } from "@hmcts/ui-baseline/environments";
import { getPropertiesVolumeSecrets } from "@hmcts-cft/cloud-native-platform";
import { createApp } from "./app.js";
import { createAuth } from "./auth.js";
import { createBaselineCache } from "./baseline.js";
import { createRunner } from "./runs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8090);
const REPO_DIR = path.resolve(__dirname, "../../..");

// Secrets mounted from the environment's vault become environment variables, as in CaTH's apps
await getPropertiesVolumeSecrets({ chartPath: path.join(__dirname, "../helm/values.yaml") });

const environmentName = process.env.UI_BASELINE_ENV ?? "test";
const environment = await loadEnvironment(environmentName);
const dataDir = process.env.UI_BASELINE_DATA_DIR ?? path.join(tmpdir(), "ui-baseline");
await mkdir(dataDir, { recursive: true });
const store = baselineContainer(environment);

const baseline = createBaselineCache({
  dir: path.join(dataDir, "baseline"),
  store,
  latest: latestBaseline,
  pull: (dir, id) => pullBaseline(environment, dir, id)
});
const runner = createRunner({
  dataDir,
  repoDir: REPO_DIR,
  environment: environmentName,
  commit: process.env.GIT_COMMIT ?? "unknown",
  store,
  baseline: () => baseline.ensure()
});
await runner.restore().catch((error: Error) => console.error(`[ui-baseline] could not load earlier runs: ${error.message}`));

const authDisabled = process.env.UI_BASELINE_AUTH_DISABLED === "true";
if (authDisabled && process.env.NODE_ENV === "production") throw new Error("UI_BASELINE_AUTH_DISABLED is for a developer's machine only");
const baseUrl = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const auth = await createAuth({
  disabled: authDisabled,
  baseUrl,
  issuerUrl: process.env.SSO_ISSUER_URL,
  clientId: process.env.SSO_CLIENT_ID,
  clientSecret: process.env.SSO_CLIENT_SECRET,
  // CaTH's admin groups by default: the people who can already see CaTH's admin pages
  allowedGroupIds: (
    process.env.UI_BASELINE_ALLOWED_GROUP_IDS ??
    [process.env.SSO_SYSTEM_ADMIN_GROUP_ID, process.env.SSO_INTERNAL_ADMIN_CTSC_GROUP_ID, process.env.SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID].join(",")
  )
    .split(",")
    .filter(Boolean),
  secureCookies: baseUrl.startsWith("https://")
});

const app = createApp({ environment: environmentName, auth, runner, baselineStatus: () => baseline.status() });
app.listen(PORT, () => console.log(`[ui-baseline] checking CaTH in ${environmentName} on port ${PORT}`));

// Fetched now so the first check does not wait for it
baseline.ensure().catch((error: Error) => console.error(`[ui-baseline] could not fetch the baseline: ${error.message}`));
