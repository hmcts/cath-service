import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "redis";
import type { ParityUser } from "../fixtures/manifest.js";
import type { CathUser } from "./records.js";
import { CATH_ROLE, LOCALES, type SignIns } from "./sign-ins.js";

// Local parity sign-in for CaTH, the counterpart of pip's /parity-login. Local CaTH has no
// identity providers, so instead of a route in CaTH this writes the session a real sign-in would
// leave behind (passport stores the whole user profile) straight into CaTH's Redis, and hands back
// the signed session cookie. Nothing in CaTH changes, and it can only work where the session
// secret and Redis are to hand: a local CaTH.
// Express-session's defaults, which CaTH's session middleware does not override
const COOKIE_NAME = "connect.sid";
const SESSION_PREFIX = "sess:";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 4;

export async function signInWithSessions(users: ParityUser[]): Promise<SignIns> {
  const secret = process.env.SESSION_SECRET;
  const redisUrl = process.env.REDIS_URL;
  if (!secret || !redisUrl) throw new Error("SESSION_SECRET and REDIS_URL must be set: run with --env-file=.env, as CaTH's web app is");

  const { prisma } = await import("@hmcts/postgres-prisma");
  const redis = createClient({ url: redisUrl });
  await redis.connect();
  const result: SignIns = { users: {}, cathUsers: {}, unavailable: {} };
  try {
    for (const user of users) {
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
      const cookies: SignIns["users"][string]["cookies"] = {};
      for (const locale of LOCALES) cookies[locale] = [await createSession(redis, secret, profile, locale)];
      result.users[user.id] = { userId: dbUser.userId, role, cookies };
      result.cathUsers[user.id] = { userId: dbUser.userId, email: user.email, role, provenance: user.provenance } satisfies CathUser;
    }
  } finally {
    await redis.quit();
  }
  return result;
}

async function createSession(
  redis: ReturnType<typeof createClient>,
  secret: string,
  profile: Record<string, string>,
  locale: string
): Promise<{ name: string; value: string }> {
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
  return { name: COOKIE_NAME, value: encodeURIComponent(`s:${signCookie(secret, sessionId)}`) };
}

// cookie-signature's format, which express-session verifies
function signCookie(secret: string, value: string): string {
  return `${value}.${createHmac("sha256", secret).update(value).digest("base64").replace(/=+$/, "")}`;
}
