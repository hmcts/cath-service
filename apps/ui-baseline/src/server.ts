import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPropertiesVolumeSecrets } from "@hmcts-cft/cloud-native-platform";
import { baselineContainer, latestBaseline, pullBaseline } from "../baseline-store.js";
import { loadEnvironment } from "../environments.js";
import { createApp } from "./app.js";
import { createBaselineCache } from "./baseline.js";
import { createRunner } from "./runs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8090);
const REPO_DIR = path.resolve(__dirname, "../../..");

// In the pod, secrets mounted from the environment's vault become environment variables, as in
// CaTH's apps. A local run needs none: a check reads what it needs from the vault itself
// (environments.ts), as whoever is signed in to the Azure CLI.
if (process.env.NODE_ENV === "production") await getPropertiesVolumeSecrets({ chartPath: path.join(__dirname, "../helm/values.yaml") });

const environmentName = process.env.UI_BASELINE_ENV ?? "aat";
const environment = await loadEnvironment(environmentName);
const dataDir = process.env.UI_BASELINE_DATA_DIR ?? path.join(tmpdir(), "ui-baseline");
await mkdir(dataDir, { recursive: true });
const store = baselineContainer(environment);

const baseline = createBaselineCache({
  root: path.join(dataDir, "baselines"),
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
  baseline: (id) => baseline.ensure(id)
});

const app = createApp({ environment: environmentName, runner, dataDir, baselineStatus: () => baseline.status() });
app.listen(PORT, () => console.log(`[ui-baseline] checking CaTH in ${environmentName} on port ${PORT}`));

// Loaded once the pod is listening, so a long history does not hold up its start: the list of runs
// fills in as they load
runner.restore().catch((error: Error) => console.error(`[ui-baseline] could not load earlier runs: ${error.message}`));

// Fetched now so the first check does not wait for it, and let go at once: holding it would keep it
// on the pod's disk however many newer baselines replaced it
baseline
  .ensure()
  .then((fetched) => fetched.release())
  .catch((error: Error) => console.error(`[ui-baseline] could not fetch the baseline: ${error.message}`));
