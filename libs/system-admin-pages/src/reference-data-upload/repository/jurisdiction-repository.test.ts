import { prisma } from "@hmcts/postgres";
import { describe, expect, it, vi } from "vitest";
import { checkJurisdictionExists, createJurisdiction, getMaxJurisdictionId } from "./jurisdiction-repository.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    jurisdiction: {
      findFirst: vi.fn(),
      create: vi.fn()
    }
  }
}));

describe("getMaxJurisdictionId", () => {
  it("should return the highest jurisdiction ID", async () => {
    vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue({
      jurisdictionId: 5,
      name: "Test",
      welshName: "Test"
    } as any);

    const result = await getMaxJurisdictionId();

    expect(result).toBe(5);
    expect(prisma.jurisdiction.findFirst).toHaveBeenCalledWith({
      orderBy: {
        jurisdictionId: "desc"
      },
      select: {
        jurisdictionId: true
      }
    });
  });

  it("should return 0 when no jurisdictions exist", async () => {
    vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue(null);

    const result = await getMaxJurisdictionId();

    expect(result).toBe(0);
  });
});

describe("checkJurisdictionExists", () => {
  it("should return true for both when names exist", async () => {
    vi.mocked(prisma.jurisdiction.findFirst)
      .mockResolvedValueOnce({
        jurisdictionId: 1,
        name: "Civil",
        welshName: "Sifil"
      } as any)
      .mockResolvedValueOnce({
        jurisdictionId: 1,
        name: "Civil",
        welshName: "Sifil"
      } as any);

    const result = await checkJurisdictionExists("Civil", "Sifil");

    expect(result.nameExists).toBe(true);
    expect(result.welshNameExists).toBe(true);
  });

  it("should return false for both when names do not exist", async () => {
    vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const result = await checkJurisdictionExists("New", "Newydd");

    expect(result.nameExists).toBe(false);
    expect(result.welshNameExists).toBe(false);
  });

  it("should check case-insensitively", async () => {
    vi.mocked(prisma.jurisdiction.findFirst)
      .mockResolvedValueOnce({
        jurisdictionId: 1,
        name: "Civil",
        welshName: "Sifil"
      } as any)
      .mockResolvedValueOnce(null);

    await checkJurisdictionExists("CIVIL", "sifil");

    expect(prisma.jurisdiction.findFirst).toHaveBeenCalledWith({
      where: {
        name: {
          equals: "CIVIL",
          mode: "insensitive"
        }
      }
    });
  });
});

describe("createJurisdiction", () => {
  it("should create jurisdiction with auto-incremented ID", async () => {
    vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue({
      jurisdictionId: 4,
      name: "Test",
      welshName: "Test"
    } as any);

    vi.mocked(prisma.jurisdiction.create).mockResolvedValue({
      jurisdictionId: 5,
      name: "New Jurisdiction",
      welshName: "Awdurdodaeth Newydd"
    } as any);

    await createJurisdiction("New Jurisdiction", "Awdurdodaeth Newydd");

    expect(prisma.jurisdiction.create).toHaveBeenCalledWith({
      data: {
        jurisdictionId: 5,
        name: "New Jurisdiction",
        welshName: "Awdurdodaeth Newydd"
      }
    });
  });

  it("should trim whitespace from names", async () => {
    vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue({
      jurisdictionId: 4,
      name: "Test",
      welshName: "Test"
    } as any);

    vi.mocked(prisma.jurisdiction.create).mockResolvedValue({
      jurisdictionId: 5,
      name: "Test",
      welshName: "Test"
    } as any);

    await createJurisdiction("  Test  ", "  Test  ");

    expect(prisma.jurisdiction.create).toHaveBeenCalledWith({
      data: {
        jurisdictionId: 5,
        name: "Test",
        welshName: "Test"
      }
    });
  });

  it("should start from 1 when no jurisdictions exist", async () => {
    vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue(null);

    vi.mocked(prisma.jurisdiction.create).mockResolvedValue({
      jurisdictionId: 1,
      name: "First",
      welshName: "Cyntaf"
    } as any);

    await createJurisdiction("First", "Cyntaf");

    expect(prisma.jurisdiction.create).toHaveBeenCalledWith({
      data: {
        jurisdictionId: 1,
        name: "First",
        welshName: "Cyntaf"
      }
    });
  });
});
