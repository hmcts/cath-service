/**
 * Verified-user specs each create and log in as their own prefixed user, so parallel tests never see each other's
 * subscriptions. Only cft-idam.spec.ts logs in with the shared CFT IDAM account, because that is what it tests.
 */

import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { generateTestEmail, prefixName } from "./test-prefix.js";
import { createTestUser } from "./test-support-api.js";

export async function createVerifiedTestUser(options: { provenance?: "CFT_IDAM" | "PI_AAD" | "CRIME_IDAM"; label?: string } = {}): Promise<VerifiedTestUser> {
  const { provenance = "CFT_IDAM", label = "verified" } = options;
  const uniqueId = randomUUID();

  const user = await createTestUser({
    email: generateTestEmail(`${label}-${uniqueId}`),
    firstName: "Verified",
    surname: "User",
    userProvenance: provenance,
    userProvenanceId: prefixName(`verified-${uniqueId}`),
    role: "VERIFIED"
  });

  return { userId: user.userId, email: user.email, provenance };
}

// POST /test-support/login is only mounted where test-support is (non-production or ENABLE_TEST_SUPPORT=true).
// page.request shares the browser context's cookie jar, so the session cookie it receives logs the page in.
export async function loginAsTestUser(page: Page, user: { userId: string }): Promise<void> {
  const response = await page.request.post("/test-support/login", { data: { userId: user.userId } });
  if (!response.ok()) {
    throw new Error(`POST /test-support/login failed: ${response.status()} ${await response.text()}`);
  }
}

export interface VerifiedTestUser {
  userId: string;
  email: string;
  provenance: string;
}
