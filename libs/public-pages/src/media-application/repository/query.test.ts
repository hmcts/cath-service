import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaApplicationCreateData } from "./model.js";
import { createMediaApplication } from "./query.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    mediaApplication: {
      create: vi.fn()
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
      fullName: "John Smith",
      email: "JOHN@EXAMPLE.COM",
      employer: "BBC News"
    };

    vi.mocked(prisma.mediaApplication.create).mockResolvedValue({
      id: mockId,
      fullName: "John Smith",
      email: "john@example.com",
      employer: "BBC News",
      status: "PENDING",
      requestDate: new Date(),
      statusDate: new Date()
    });

    const result = await createMediaApplication(mockData);

    expect(result).toBe(mockId);
    expect(prisma.mediaApplication.create).toHaveBeenCalledWith({
      data: {
        fullName: "John Smith",
        email: "john@example.com",
        employer: "BBC News",
        status: "PENDING",
        requestDate: expect.any(Date),
        statusDate: expect.any(Date)
      }
    });
  });

  it("should normalize email to lowercase", async () => {
    const mockId = "test-uuid-456";
    const mockData: MediaApplicationCreateData = {
      fullName: "Jane Doe",
      email: "JANE.DOE@EXAMPLE.COM",
      employer: "The Guardian"
    };

    vi.mocked(prisma.mediaApplication.create).mockResolvedValue({
      id: mockId,
      fullName: "Jane Doe",
      email: "jane.doe@example.com",
      employer: "The Guardian",
      status: "PENDING",
      requestDate: new Date(),
      statusDate: new Date()
    });

    await createMediaApplication(mockData);

    expect(prisma.mediaApplication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "jane.doe@example.com"
      })
    });
  });
});
