import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaApplicationCreateData } from "./model.js";
import { createMediaApplication, updateProofOfIdPath } from "./query.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    mediaApplication: {
      create: vi.fn(),
      update: vi.fn()
    }
  }
}));

const { prisma } = await import("@hmcts/postgres");

describe("createMediaApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a media application with PENDING status", async () => {
    const mockId = "test-uuid-123";
    const mockData: MediaApplicationCreateData = {
      name: "John Smith",
      email: "JOHN@EXAMPLE.COM",
      employer: "BBC News"
    };

    vi.mocked(prisma.mediaApplication.create).mockResolvedValue({
      id: mockId,
      name: "John Smith",
      email: "john@example.com",
      employer: "BBC News",
      status: "PENDING",
      appliedDate: new Date(),
      proofOfIdPath: null,
      reviewedDate: null,
      reviewedBy: null
    });

    const result = await createMediaApplication(mockData);

    expect(result).toBe(mockId);
    expect(prisma.mediaApplication.create).toHaveBeenCalledWith({
      data: {
        name: "John Smith",
        email: "john@example.com",
        employer: "BBC News",
        status: "PENDING",
        appliedDate: expect.any(Date)
      }
    });
  });

  it("should normalize email to lowercase", async () => {
    const mockId = "test-uuid-456";
    const mockData: MediaApplicationCreateData = {
      name: "Jane Doe",
      email: "JANE.DOE@EXAMPLE.COM",
      employer: "The Guardian"
    };

    vi.mocked(prisma.mediaApplication.create).mockResolvedValue({
      id: mockId,
      name: "Jane Doe",
      email: "jane.doe@example.com",
      employer: "The Guardian",
      status: "PENDING",
      appliedDate: new Date(),
      proofOfIdPath: null,
      reviewedDate: null,
      reviewedBy: null
    });

    await createMediaApplication(mockData);

    expect(prisma.mediaApplication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "jane.doe@example.com"
      })
    });
  });

  describe("updateProofOfIdPath", () => {
    it("should update proof of ID path for an application", async () => {
      const mockId = "test-uuid-789";
      const mockPath = "/storage/temp/files/test-uuid-789.jpg";

      vi.mocked(prisma.mediaApplication.update).mockResolvedValue({
        id: mockId,
        name: "Test User",
        email: "test@example.com",
        employer: "Test Employer",
        status: "PENDING",
        appliedDate: new Date(),
        proofOfIdPath: mockPath,
        reviewedDate: null,
        reviewedBy: null
      });

      await updateProofOfIdPath(mockId, mockPath, "test-file.pdf");

      expect(prisma.mediaApplication.update).toHaveBeenCalledWith({
        where: { id: mockId },
        data: {
          proofOfIdPath: mockPath,
          proofOfIdOriginalName: "test-file.pdf"
        }
      });
    });
  });
});
