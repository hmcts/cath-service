import { vi } from "vitest";

// Global mock for @hmcts/postgres to prevent Prisma initialization in tests
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
    }
  }
}));
