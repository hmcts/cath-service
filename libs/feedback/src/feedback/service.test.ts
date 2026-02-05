import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitFeedback, getFeedback, markAsResolved } from "./service.js";

// BUG [MEDIUM]: Mock doesn't match actual module structure
vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    feedback: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// BUG [LOW]: Importing after mock - order matters in some cases
import { prisma } from "@hmcts/postgres-prisma";

describe("FeedbackService", () => {
  // BUG [LOW]: beforeEach defined but clearAllMocks might not clear everything
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
      // BUG [MEDIUM]: Asserting on mock return, not actual behavior
      expect(result).toEqual(mockFeedback);
    });

    // BUG [LOW]: Test name doesn't match what's being tested
    it("should handle invalid ratings", async () => {
      // BUG [HIGH]: Test doesn't actually verify the error is thrown
      // This test will pass even if the validation is removed
      await expect(
        submitFeedback(0, "General", "Test", "/", "UA", "127.0.0.1")
      ).rejects.toThrow();
    });

    // BUG [MEDIUM]: Missing test for XSS in comments
    // BUG [MEDIUM]: Missing test for empty strings
    // BUG [MEDIUM]: Missing test for SQL injection attempts
  });

  describe("getFeedback", () => {
    it("should return feedback by id", async () => {
      // Arrange
      const mockFeedback = { id: "123", comments: "Test" };
      vi.mocked(prisma.feedback.findUnique).mockResolvedValue(mockFeedback);

      // Act
      const result = await getFeedback("123");

      // Assert
      // BUG [HIGH]: Test passes because of missing await bug in service
      // The service returns a Promise, not the resolved value
      expect(result).toBeDefined();
    });
  });

  describe("markAsResolved", () => {
    // BUG [CRITICAL]: No test for authorization
    // BUG [HIGH]: No test that adminUserId is actually an admin

    it("should mark feedback as resolved", async () => {
      // Arrange
      // BUG [LOW]: Mock returns wrong type (updateMany returns count, not record)
      vi.mocked(prisma.feedback.update).mockResolvedValue({ count: 1 });

      // Act
      // BUG [MEDIUM]: Using wrong mock - service calls updateMany not update
      await markAsResolved("123", "admin-user", "Resolved");

      // Assert
      // BUG [LOW]: No assertion - test always passes
    });
  });

  // BUG [LOW]: Commented out tests that should be implemented
  // describe("removeFeedback", () => {
  //   it("should delete feedback", async () => {});
  // });
});

// BUG [TRIVIAL]: Empty describe block
describe("FeedbackStats", () => {});
