import { parseArgs } from "node:util";
import { loadEnvironment } from "../environments.js";
import { type PipApi, type PipService, pipApi } from "./pip-api.js";
import { finishRun, openRuns, type PipRun } from "./run.js";

// Deletes what recordings in a shared environment seeded (pip/seed.ts), through pip's testing-support
// endpoints, by the run's token (pip/run.ts): every run not yet cleaned up, so one that died before
// its cleanup goes too. What references a location goes before the location. A run whose cleanup
// fails is kept, to be tried again next time, and the script exits 1.
//   tsx apps/ui-baseline/pip/cleanup.ts --env aat
const { values: args } = parseArgs({ options: { env: { type: "string", default: "aat" } }, strict: false, args: process.argv.slice(2) });
const environment = await loadEnvironment(String(args.env));
if (environment.name === "local") throw new Error("the local pip is recreated empty for each recording, so it has nothing to clean up");

const runs = await openRuns(environment.name);
if (!runs.length) console.log(`nothing to clean up in pip ${environment.name}`);
const api = runs.length ? await pipApi(environment) : null;
let failed = 0;
for (const run of runs) {
  try {
    await cleanUp(api as PipApi, run);
    await finishRun(environment.name, run.token);
  } catch (error) {
    failed++;
    console.log(`could not clean up run ${run.token}: ${(error as Error).message}`);
  }
}
if (failed) process.exitCode = 1;

async function cleanUp(pip: PipApi, run: PipRun): Promise<void> {
  const steps: [PipService, string, string][] = [
    ["account", `/testing-support/subscription/${run.token}`, "subscriptions"],
    ["data", `/testing-support/publication/${run.token}`, "publications"],
    ["data", `/testing-support/location/${run.token}`, "locations"],
    ["account", `/testing-support/application/${run.token}`, "media applications"],
    ["account", `/testing-support/third-party/${run.token}`, "third-party subscribers"],
    ["account", `/testing-support/audit/${run.token}`, "audit entries"],
    // Last: the run's system admin is among them
    ["account", `/testing-support/account/${run.token}`, "accounts"]
  ];
  for (const [service, endpoint, what] of steps) {
    const response = await pip.request(service, endpoint, { method: "DELETE" });
    if (!response.ok) throw new Error(`deleting its ${what} failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
    console.log(`  ${run.token}: ${(await response.text()).slice(0, 200) || `deleted its ${what}`}`);
  }
  console.log(`cleaned up run ${run.token} (started ${run.startedAt})`);
}
