import type { Request } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCsrfToken } from "./csrf.js";

interface RequestWithCsrf extends Request {
  csrfToken?: () => string;
}

describe("getCsrfToken", () => {
  let mockReq: Partial<RequestWithCsrf>;

  beforeEach(() => {
    mockReq = {};
  });

  describe("when csrfToken function is available", () => {
    it("should return the CSRF token", () => {
      // Arrange
      const expectedToken = "mock-csrf-token-123";
      mockReq.csrfToken = vi.fn(() => expectedToken);

      // Act
      const result = getCsrfToken(mockReq as Request);

      // Assert
      expect(result).toBe(expectedToken);
      expect(mockReq.csrfToken).toHaveBeenCalledTimes(1);
    });

    it("should call csrfToken function each time", () => {
      // Arrange
      const token1 = "token-1";
      const token2 = "token-2";
      mockReq.csrfToken = vi.fn().mockReturnValueOnce(token1).mockReturnValueOnce(token2);

      // Act
      const result1 = getCsrfToken(mockReq as Request);
      const result2 = getCsrfToken(mockReq as Request);

      // Assert
      expect(result1).toBe(token1);
      expect(result2).toBe(token2);
      expect(mockReq.csrfToken).toHaveBeenCalledTimes(2);
    });
  });

  describe("when csrfToken function is not available", () => {
    it("should return empty string when csrfToken is undefined", () => {
      // Arrange
      mockReq.csrfToken = undefined;

      // Act
      const result = getCsrfToken(mockReq as Request);

      // Assert
      expect(result).toBe("");
    });

    it("should return empty string when request has no csrfToken property", () => {
      // Arrange
      // mockReq has no csrfToken property

      // Act
      const result = getCsrfToken(mockReq as Request);

      // Assert
      expect(result).toBe("");
    });

    it("should return empty string when csrfToken is null", () => {
      // Arrange
      mockReq.csrfToken = null as any;

      // Act
      const result = getCsrfToken(mockReq as Request);

      // Assert
      expect(result).toBe("");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string token", () => {
      // Arrange
      mockReq.csrfToken = vi.fn(() => "");

      // Act
      const result = getCsrfToken(mockReq as Request);

      // Assert
      expect(result).toBe("");
    });

    it("should handle whitespace-only token", () => {
      // Arrange
      const whitespaceToken = "   ";
      mockReq.csrfToken = vi.fn(() => whitespaceToken);

      // Act
      const result = getCsrfToken(mockReq as Request);

      // Assert
      expect(result).toBe(whitespaceToken);
    });

    it("should handle very long token", () => {
      // Arrange
      const longToken = "x".repeat(1000);
      mockReq.csrfToken = vi.fn(() => longToken);

      // Act
      const result = getCsrfToken(mockReq as Request);

      // Assert
      expect(result).toBe(longToken);
    });

    it("should handle token with special characters", () => {
      // Arrange
      const specialToken = "token-!@#$%^&*()_+=[]{}|;:',.<>?/~`";
      mockReq.csrfToken = vi.fn(() => specialToken);

      // Act
      const result = getCsrfToken(mockReq as Request);

      // Assert
      expect(result).toBe(specialToken);
    });
  });
});
