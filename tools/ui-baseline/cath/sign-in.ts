import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { openBlobContainer } from "@hmcts/ui-baseline";
import { filesStorage, loadEnvironment } from "../environments.js";
import { loadUsers } from "../fixtures/manifest.js";
import { prismaRecordStore, type SeedRecords, seedRecords, testSupportRecordStore } from "./records.js";
import type { SignedInUser } from "./sign-ins.js";

// Signs CaTH's fixture users in, so pages behind sign-in are captured as the user pip's baseline
// used, then creates the records signed-in pages show (records.json), which need the users first.
// How depends on the environment (environments.json): a local CaTH gets sessions written into its
// Redis (session-sign-in.ts); a deployed one is signed in to as real test accounts
// (account-sign-in.ts). Run locally with the root .env, as the web app is:
//   tsx --env-file=.env tools/ui-baseline/cath/sign-in.ts [--env test]
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const { values: args } = parseArgs({ options: { env: { type: "string" } } });
const environment = await loadEnvironment(args.env);
const output = process.env.PARITY_SIGN_IN_OUTPUT ?? path.join(PARITY_DIR, "output/seed", `cath-sign-in-${environment.name}.json`);
const users = await loadUsers();

const signIns =
  environment.cath.signIn === "session"
    ? await (await import("./session-sign-in.js")).signInWithSessions(users)
    : await (await import("./account-sign-in.js")).signInWithAccounts(environment, users);
for (const [user, reason] of Object.entries(signIns.unavailable)) console.log(`not signed in: ${user}: ${reason}`);

// Records owned by a user who could not be signed in are left out with that user
const store =
  environment.cath.signIn === "session"
    ? await prismaRecordStore()
    : testSupportRecordStore(environment.cath.apiUrl, openBlobContainer(filesStorage("cath", environment.cath, "files")));
const records = await seedRecords(store, signIns.cathUsers);
if (environment.cath.signIn === "session") await (await import("@hmcts/postgres-prisma")).prisma.$disconnect();

// Looked up by name, never assumed: list type ids differ between environments
const listTypes = Object.fromEntries(
  ((await (await fetch(`${environment.cath.apiUrl}/test-support/list-types`)).json()) as { id: number; name: string }[]).map((listType) => [
    listType.name,
    String(listType.id)
  ])
);

const result: SignInResult = {
  signedInAt: new Date().toISOString(),
  environment: environment.name,
  users: signIns.users,
  unavailable: signIns.unavailable,
  records,
  listTypes
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`signed in ${Object.keys(signIns.users).length} users and ensured ${Object.keys(records).length} records → ${output}`);

export interface SignInResult {
  signedInAt: string;
  environment: string;
  users: Record<string, SignedInUser>;
  unavailable: Record<string, string>;
  records: SeedRecords;
  // CaTH's list type id by name, for routes that take one in the path
  listTypes: Record<string, string>;
}
