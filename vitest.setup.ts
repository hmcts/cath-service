import { vi } from "vitest";

/**
 * GLOBAL MOCK FOR ALL UNIT TESTS
 *
 * This mocks @hmcts/postgres to prevent Prisma initialization in ANY package.
 * Unit tests should NEVER connect to a database or initialize Prisma.
 *
 * Why this is necessary:
 * - libs/location/src/repository/queries.ts imports prisma at the TOP of the file
 * - Any package importing from @hmcts/location triggers Prisma initialization
 * - Without this global mock, tests fail with "prisma generate" error
 *
 * This runs BEFORE any test files load, ensuring the mock is always in place.
 */
vi.mock("@hmcts/postgres", () => ({
  prisma: {
    location: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    jurisdiction: {
      findMany: vi.fn()
    },
    region: {
      findMany: vi.fn()
    },
    subJurisdiction: {
      findMany: vi.fn()
    },
    // Add any other Prisma models used in tests here
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined)
  }
}));
