import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitFeedback, getFeedback, markAsResolved } from "./service.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    feedback: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("FeedbackService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitFeedback", () => {
    it("should create feedback successfully", async () => {
      // Arrange
      const mockFeedback = {
        id: "123",
        rating: 5,
        category: "General",
        comments: "Great service",
        pageUrl: "/test",
        userAgent: "Mozilla",
        ipAddress: "127.0.0.1",
      };
      vi.mocked(prisma.feedback.create).mockResolvedValue(mockFeedback);

      // Act
      const result = await submitFeedback(
        5,
        "General",
        "Great service",
        "/test",
        "Mozilla",
        "127.0.0.1"
      );

      // Assert
      expect(result).toEqual(mockFeedback);
    });

    it("should handle invalid ratings", async () => {
      await expect(
        submitFeedback(0, "General", "Test", "/", "UA", "127.0.0.1")
      ).rejects.toThrow();
    });
  });

  describe("getFeedback", () => {
    it("should return feedback by id", async () => {
      // Arrange
      const mockFeedback = { id: "123", comments: "Test" };
      vi.mocked(prisma.feedback.findUnique).mockResolvedValue(mockFeedback);

      // Act
      const result = await getFeedback("123");

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe("markAsResolved", () => {
    it("should mark feedback as resolved", async () => {
      // Arrange
      vi.mocked(prisma.feedback.update).mockResolvedValue({ count: 1 });

      // Act
      await markAsResolved("123", "admin-user", "Resolved");

      // Assert
    });
  });
});

describe("FeedbackStats", () => {});
