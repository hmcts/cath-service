import path from "node:path";
import { parseArgs } from "node:util";
import { DEFAULT_BASELINE_DIR, pullBaseline, pushBaseline } from "./baseline-store.js";
import { loadEnvironment } from "./environments.js";

// Stores a recorded pip baseline in the environment's storage, or fetches the stored one. local (the
// default) is local Azurite; test is cathsaperftest in Azure, which the record workflow pushes to
//   yarn ui-baseline:baseline push [--dir output/baseline] [--env local|test]
//   yarn ui-baseline:baseline pull [--dir output/baseline] [--env local|test] [--id <id>]
const { positionals, values: args } = parseArgs({
  allowPositionals: true,
  options: { env: { type: "string", default: "local" }, dir: { type: "string" }, id: { type: "string" } }
});
const [command] = positionals;
const environment = await loadEnvironment(args.env);
const dir = path.resolve(args.dir ?? DEFAULT_BASELINE_DIR);

if (command === "push") {
  const stored = await pushBaseline(environment, dir);
  console.log(`stored the baseline recorded ${stored.finishedAt} from ${stored.pip} as ${stored.blob} (${environment.name})`);
} else if (command === "pull") {
  const stored = await pullBaseline(environment, dir, args.id);
  console.log(`fetched ${stored.blob} into ${dir}`);
} else {
  console.error("usage: baseline.ts push|pull [--dir <baseline dir>] [--env local|test] [--id <stored id>]");
  process.exit(1);
}
