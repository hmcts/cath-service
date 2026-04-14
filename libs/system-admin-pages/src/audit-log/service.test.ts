import type { AuditLog } from "@hmcts/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditLogFilters } from "./repository.js";
import { getAuditLogById, getAuditLogs, getAvailableActions, parseDate, validateEmail, validateUserId } from "./service.js";

vi.mock("./repository.js", () => ({
  findAll: vi.fn(),
  countByFilters: vi.fn(),
  findById: vi.fn(),
  findUniqueActions: vi.fn()
}));

describe("audit-log service", () => {
  let repository: any;

  beforeEach(async () => {
    repository = await import("./repository.js");
    vi.clearAllMocks();
  });

  describe("getAuditLogs", () => {
    it("should return formatted and paginated audit logs", async () => {
      const mockLogs: AuditLog[] = [
        {
          id: "log-1",
          timestamp: new Date("2026-01-21T10:30:00Z"),
          action: "ADD_JURISDICTION",
          details: "Name: Family Law",
          userId: "user-123",
          userEmail: "admin@justice.gov.uk",
          userRole: "SYSTEM_ADMIN",
          userProvenance: "azure-ad"
        },
        {
          id: "log-2",
          timestamp: new Date("2026-01-21T11:00:00Z"),
          action: "DELETE_COURT",
          details: null,
          userId: "user-456",
          userEmail: "admin2@justice.gov.uk",
          userRole: "SYSTEM_ADMIN",
          userProvenance: "cft-idam"
        }
      ];

      repository.findAll.mockResolvedValue(mockLogs);
      repository.countByFilters.mockResolvedValue(2);

      const filters: AuditLogFilters = { email: "admin@justice.gov.uk" };
      const result = await getAuditLogs(filters, 1, 50);

      expect(repository.findAll).toHaveBeenCalledWith(filters, 1, 50);
      expect(repository.countByFilters).toHaveBeenCalledWith(filters);
      expect(result).toEqual({
        logs: [
          {
            id: "log-1",
            timestamp: expect.stringMatching(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/),
            action: "Add Jurisdiction",
            userEmail: "admin@justice.gov.uk",
            userId: "user-123",
            userRole: "SYSTEM_ADMIN",
            userProvenance: "azure-ad",
            details: "Name: Family Law"
          },
          {
            id: "log-2",
            timestamp: expect.stringMatching(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/),
            action: "Delete Court",
            userEmail: "admin2@justice.gov.uk",
            userId: "user-456",
            userRole: "SYSTEM_ADMIN",
            userProvenance: "cft-idam",
            details: undefined
          }
        ],
        totalCount: 2,
        currentPage: 1,
        pageSize: 50,
        totalPages: 1
      });
    });

    it("should calculate total pages correctly", async () => {
      repository.findAll.mockResolvedValue([]);
      repository.countByFilters.mockResolvedValue(125);

      const result = await getAuditLogs({}, 1, 50);

      expect(result.totalPages).toBe(3); // 125 / 50 = 2.5, rounded up to 3
    });

    it("should handle empty results", async () => {
      repository.findAll.mockResolvedValue([]);
      repository.countByFilters.mockResolvedValue(0);

      const result = await getAuditLogs({}, 1, 50);

      expect(result).toEqual({
        logs: [],
        totalCount: 0,
        currentPage: 1,
        pageSize: 50,
        totalPages: 0
      });
    });

    it("should format action names to title case", async () => {
      const mockLog: AuditLog = {
        id: "log-3",
        timestamp: new Date("2026-01-21T12:00:00Z"),
        action: "REFERENCE_DATA_UPLOAD_SUMMARY",
        details: null,
        userId: "user-789",
        userEmail: "admin@justice.gov.uk",
        userRole: "SYSTEM_ADMIN",
        userProvenance: "azure-ad"
      };

      repository.findAll.mockResolvedValue([mockLog]);
      repository.countByFilters.mockResolvedValue(1);

      const result = await getAuditLogs({}, 1, 50);

      expect(result.logs[0].action).toBe("Reference Data Upload Summary");
    });

    it("should format timestamps correctly", async () => {
      const mockLog: AuditLog = {
        id: "log-4",
        timestamp: new Date("2026-01-21T10:05:03Z"),
        action: "ADD_REGION",
        details: null,
        userId: "user-999",
        userEmail: "admin@justice.gov.uk",
        userRole: "SYSTEM_ADMIN",
        userProvenance: "azure-ad"
      };

      repository.findAll.mockResolvedValue([mockLog]);
      repository.countByFilters.mockResolvedValue(1);

      const result = await getAuditLogs({}, 1, 50);

      // Timestamp format: dd/mm/yyyy hh:mm:ss
      expect(result.logs[0].timestamp).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/);
    });
  });

  describe("getAuditLogById", () => {
    it("should return formatted audit log when found", async () => {
      const mockLog: AuditLog = {
        id: "log-123",
        timestamp: new Date("2026-01-21T10:30:00Z"),
        action: "ADD_JURISDICTION",
        details: "Name: Family Law",
        userId: "user-123",
        userEmail: "admin@justice.gov.uk",
        userRole: "SYSTEM_ADMIN",
        userProvenance: "azure-ad"
      };

      repository.findById.mockResolvedValue(mockLog);

      const result = await getAuditLogById("log-123");

      expect(repository.findById).toHaveBeenCalledWith("log-123");
      expect(result).toEqual({
        id: "log-123",
        timestamp: expect.stringMatching(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/),
        action: "Add Jurisdiction",
        userEmail: "admin@justice.gov.uk",
        userId: "user-123",
        userRole: "SYSTEM_ADMIN",
        userProvenance: "azure-ad",
        details: "Name: Family Law"
      });
    });

    it("should return null when not found", async () => {
      repository.findById.mockResolvedValue(null);

      const result = await getAuditLogById("non-existent");

      expect(repository.findById).toHaveBeenCalledWith("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("validateEmail", () => {
    it("should return true for valid email", () => {
      expect(validateEmail("admin@justice.gov.uk")).toBe(true);
      expect(validateEmail("user.name+tag@example.com")).toBe(true);
      expect(validateEmail("test@subdomain.example.co.uk")).toBe(true);
    });

    it("should return false for invalid email", () => {
      expect(validateEmail("invalid-email")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
      expect(validateEmail("user @example.com")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });

    it("should return false for email exceeding max length", () => {
      const longEmail = `${"a".repeat(250)}@example.com`; // > 254 characters
      expect(validateEmail(longEmail)).toBe(false);
    });

    it("should return true for email at max length", () => {
      const maxLengthEmail = `${"a".repeat(240)}@example.com`; // Exactly 254 characters
      expect(validateEmail(maxLengthEmail)).toBe(true);
    });
  });

  describe("validateUserId", () => {
    it("should return true for valid user ID", () => {
      expect(validateUserId("user123")).toBe(true);
      expect(validateUserId("ABC123")).toBe(true);
      expect(validateUserId("123456")).toBe(true);
      expect(validateUserId("a")).toBe(true);
      expect(validateUserId("user-123")).toBe(true);
      expect(validateUserId("abc-def-ghi")).toBe(true);
    });

    it("should return false for invalid user ID", () => {
      expect(validateUserId("user@123")).toBe(false);
      expect(validateUserId("user 123")).toBe(false);
      expect(validateUserId("user_123")).toBe(false);
      expect(validateUserId("")).toBe(false);
    });

    it("should return false for user ID exceeding max length", () => {
      const longUserId = "a".repeat(51); // > 50 characters
      expect(validateUserId(longUserId)).toBe(false);
    });

    it("should return true for user ID at max length", () => {
      const maxLengthUserId = "a".repeat(50); // Exactly 50 characters
      expect(validateUserId(maxLengthUserId)).toBe(true);
    });
  });

  describe("parseDate", () => {
    it("should parse valid date", () => {
      const result = parseDate("21", "01", "2026");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(21);
      expect(result?.getMonth()).toBe(0); // January is 0
      expect(result?.getFullYear()).toBe(2026);
    });

    it("should parse leap year date correctly", () => {
      const result = parseDate("29", "02", "2024");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(29);
      expect(result?.getMonth()).toBe(1); // February is 1
    });

    it("should return null for invalid leap year date", () => {
      const result = parseDate("29", "02", "2023"); // 2023 is not a leap year
      expect(result).toBeNull();
    });

    it("should return null for invalid day", () => {
      expect(parseDate("32", "01", "2026")).toBeNull();
      expect(parseDate("0", "01", "2026")).toBeNull();
      expect(parseDate("-1", "01", "2026")).toBeNull();
    });

    it("should return null for invalid month", () => {
      expect(parseDate("21", "13", "2026")).toBeNull();
      expect(parseDate("21", "0", "2026")).toBeNull();
      expect(parseDate("21", "-1", "2026")).toBeNull();
    });

    it("should return null for non-numeric values", () => {
      expect(parseDate("abc", "01", "2026")).toBeNull();
      expect(parseDate("21", "xyz", "2026")).toBeNull();
      expect(parseDate("21", "01", "abcd")).toBeNull();
    });

    it("should return null for empty strings", () => {
      expect(parseDate("", "01", "2026")).toBeNull();
      expect(parseDate("21", "", "2026")).toBeNull();
      expect(parseDate("21", "01", "")).toBeNull();
    });

    it("should handle month boundaries correctly", () => {
      expect(parseDate("31", "01", "2026")).toBeInstanceOf(Date); // January has 31 days
      expect(parseDate("31", "04", "2026")).toBeNull(); // April has 30 days
      expect(parseDate("28", "02", "2026")).toBeInstanceOf(Date); // Non-leap year February
      expect(parseDate("29", "02", "2026")).toBeNull(); // Non-leap year February
    });
  });

  describe("getAvailableActions", () => {
    it("should return formatted action list", async () => {
      repository.findUniqueActions.mockResolvedValue(["ADD_JURISDICTION", "DELETE_COURT", "REFERENCE_DATA_UPLOAD"]);

      const result = await getAvailableActions();

      expect(repository.findUniqueActions).toHaveBeenCalled();
      expect(result).toEqual([
        { value: "ADD_JURISDICTION", text: "Add Jurisdiction" },
        { value: "DELETE_COURT", text: "Delete Court" },
        { value: "REFERENCE_DATA_UPLOAD", text: "Reference Data Upload" }
      ]);
    });

    it("should handle empty action list", async () => {
      repository.findUniqueActions.mockResolvedValue([]);

      const result = await getAvailableActions();

      expect(result).toEqual([]);
    });

    it("should format multi-word actions correctly", async () => {
      repository.findUniqueActions.mockResolvedValue(["REFERENCE_DATA_UPLOAD_SUMMARY"]);

      const result = await getAvailableActions();

      expect(result[0].text).toBe("Reference Data Upload Summary");
    });
  });
});
