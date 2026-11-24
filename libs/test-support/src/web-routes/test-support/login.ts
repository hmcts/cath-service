import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

const VERIFIED_ROLE = "VERIFIED";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Starts a real Passport session for a test-created verified user, exactly as the CFT IDAM and B2C callbacks do after
// their token exchange, so E2E specs can act as their own user instead of sharing one external IDAM account
export const POST = async (req: Request, res: Response) => {
  try {
    const { userId } = (req.body ?? {}) as { userId?: unknown };

    if (typeof userId !== "string" || !UUID_PATTERN.test(userId)) {
      return res.status(400).json({ error: "userId must be a user id" });
    }

    const user = await prisma.user.findUnique({ where: { userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Admin roles come from SSO group membership, so only verified users can be impersonated here
    if (user.role !== VERIFIED_ROLE) {
      return res.status(403).json({ error: "Only VERIFIED users can be logged in through test-support" });
    }

    const sessionUser: TestSessionUser = {
      id: user.userId,
      email: user.email,
      displayName: [user.firstName, user.surname].filter(Boolean).join(" ") || user.email,
      role: user.role,
      provenance: user.userProvenance
    };

    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        return respondWithLoginFailure(res, regenerateError);
      }

      req.login(sessionUser, (loginError) => {
        if (loginError) {
          return respondWithLoginFailure(res, loginError);
        }

        (req.session as typeof req.session & { lastActivity?: number }).lastActivity = Date.now();

        req.session.save((saveError) => {
          if (saveError) {
            return respondWithLoginFailure(res, saveError);
          }

          return res.json({ userId: sessionUser.id, email: sessionUser.email, role: sessionUser.role, provenance: sessionUser.provenance });
        });
      });
    });
  } catch (error) {
    return respondWithLoginFailure(res, error);
  }
};

function respondWithLoginFailure(res: Response, error: unknown) {
  console.error("Error logging in test user:", error);
  return res.status(500).json({ error: "Failed to log in test user" });
}

// Mirrors the UserProfile the login callbacks pass to req.login (@hmcts/auth)
interface TestSessionUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  provenance: string;
}
