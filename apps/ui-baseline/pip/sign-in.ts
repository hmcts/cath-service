import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadEnvironment } from "../environments.js";
import { loadUsers } from "../fixtures/manifest.js";
import { signInToPipWithAccounts } from "./account-sign-in.js";

// Signs pip's fixture users in to a deployed pip as the environment's test accounts
// (account-sign-in.ts), and writes their sessions, which are live credentials, to the gitignored
// output/seed. Prints only who signed in. --only limits it to some "<role>/<provenance>" keys.
//   tsx apps/ui-baseline/pip/sign-in.ts --env aat [--only VERIFIED/CFT_IDAM]...
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const { values: args } = parseArgs({ options: { env: { type: "string", default: "aat" }, only: { type: "string", multiple: true } } });
const environment = await loadEnvironment(args.env);
const users = (await loadUsers()).filter((user) => !args.only || args.only.includes(`${user.role}/${user.provenance}`));
if (!users.length) throw new Error(`no fixture users match --only ${args.only?.join(", ")}`);

const signIns = await signInToPipWithAccounts(environment, users);
for (const [user, reason] of Object.entries(signIns.unavailable)) console.log(`not signed in: ${user}: ${reason}`);

const output = path.join(PARITY_DIR, "output/seed", `pip-sign-in-${environment.name}.json`);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ signedInAt: new Date().toISOString(), environment: environment.name, ...signIns }, null, 2)}\n`, { mode: 0o600 });
console.log(`signed in ${Object.keys(signIns.users).length} of ${users.length} pip users → ${output}`);
