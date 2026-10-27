import { createHmac, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@hmcts/postgres-prisma";
import { createClient } from "redis";
import { loadUsers, type ParityUser } from "../fixtures/manifest.js";
import { type SeedRecords, seedRecords } from "./records.js";

// Local parity sign-in for CaTH, the counterpart of pip's /parity-login. Local CaTH has no
// identity providers, so instead of a route in CaTH this writes the session a real sign-in would
// leave behind (passport stores the whole user profile) straight into CaTH's Redis, and hands back
// the signed session cookie. Nothing in CaTH changes, and it can only work where the session
// secret and Redis are to hand: a local CaTH. It then creates the records signed-in pages show
// (records.json), which need the users to exist first.
// Run with the root .env, as the web app is: tsx --env-file=.env tools/ui-baseline/cath/sign-in.ts
const OUTPUT = process.env.PARITY_SIGN_IN_OUTPUT ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "../output/seed/cath-sign-in.json");
// Express-session's defaults, which CaTH's session middleware does not override
const COOKIE_NAME = "connect.sid";
const SESSION_PREFIX = "sess:";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 4;
// CaTH keeps the language in the session, so each language gets its own session; sharing one
// would let a Welsh capture turn the next English capture of the same user Welsh
const LOCALES = ["en", "cy"];
// CaTH has no super admins; pip's map to the admin role with the same reach
const CATH_ROLE: Record<string, string> = {
  VERIFIED: "VERIFIED",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  INTERNAL_SUPER_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
  INTERNAL_SUPER_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL",
  INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
  INTERNAL_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL"
};

const secret = process.env.SESSION_SECRET;
const redisUrl = process.env.REDIS_URL;
if (!secret || !redisUrl) throw new Error("SESSION_SECRET and REDIS_URL must be set: run with --env-file=.env, as CaTH's web app is");

const redis = createClient({ url: redisUrl });
await redis.connect();
const sessions: SignInResult = { signedInAt: new Date().toISOString(), users: {}, records: {}, listTypes: {} };
try {
  const users = await loadUsers();
  for (const user of users) sessions.users[user.id] = await signIn(user);
  sessions.records = await seedRecords(users, Object.fromEntries(Object.entries(sessions.users).map(([id, user]) => [id, user.userId])));
  // Looked up by name, never assumed: list type ids differ between environments
  for (const listType of await prisma.listType.findMany({ select: { id: true, name: true } })) sessions.listTypes[listType.name] = String(listType.id);
} finally {
  await redis.quit();
  await prisma.$disconnect();
}
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(sessions, null, 2)}\n`);
console.log(`signed in ${Object.keys(sessions.users).length} users and ensured ${Object.keys(sessions.records).length} records → ${OUTPUT}`);

async function signIn(user: ParityUser): Promise<SignedInUser> {
  const role = CATH_ROLE[user.role];
  if (!role) throw new Error(`no CaTH role for ${user.id} (${user.role})`);
  // Keyed on the provenance id, as CaTH's own sign-in callbacks are, so re-running reuses the user
  const dbUser = await prisma.user.upsert({
    where: { userProvenanceId: user.provenanceUserId },
    update: { role, lastSignedInDate: new Date() },
    create: {
      email: user.email,
      firstName: user.forenames,
      surname: user.surname,
      userProvenance: user.provenance,
      userProvenanceId: user.provenanceUserId,
      role,
      lastSignedInDate: new Date()
    }
  });

  const profile = { id: dbUser.userId, email: user.email, displayName: `${user.forenames} ${user.surname}`, role, provenance: user.provenance };
  const cookies: SignedInUser["cookies"] = {};
  for (const locale of LOCALES) cookies[locale] = await createSession(profile, locale);
  return { userId: dbUser.userId, role, cookies };
}

async function createSession(profile: Record<string, string>, locale: string): Promise<{ name: string; value: string }> {
  const sessionId = randomUUID();
  const session = {
    cookie: {
      originalMaxAge: SESSION_MAX_AGE_MS,
      expires: new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString(),
      secure: false,
      httpOnly: true,
      path: "/"
    },
    passport: { user: profile },
    locale,
    lastActivity: Date.now()
  };
  await redis.set(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(session), { EX: SESSION_MAX_AGE_MS / 1000 });
  return { name: COOKIE_NAME, value: encodeURIComponent(`s:${signCookie(sessionId)}`) };
}

// cookie-signature's format, which express-session verifies
function signCookie(value: string): string {
  return `${value}.${createHmac("sha256", secret as string)
    .update(value)
    .digest("base64")
    .replace(/=+$/, "")}`;
}

export interface SignInResult {
  signedInAt: string;
  users: Record<string, SignedInUser>;
  records: SeedRecords;
  // CaTH's list type id by name, for routes that take one in the path
  listTypes: Record<string, string>;
}

interface SignedInUser {
  userId: string;
  role: string;
  cookies: Record<string, { name: string; value: string }>;
}
