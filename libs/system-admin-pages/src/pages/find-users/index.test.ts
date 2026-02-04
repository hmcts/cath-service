import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "../../user-management/queries.js";
import { GET, POST } from "./index.js";

vi.mock("../../user-management/queries.js", () => ({
  searchUsers: vi.fn()
}));

describe("find-users page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockSession: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = {};
    mockRequest = {
      query: {},
      body: {},
      params: {},
      session: mockSession
    };
    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET handler", () => {
    it("should render find-users page with no filters", async () => {
      // Arrange
      const mockSearchResult = {
        users: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "find-users/index",
        expect.objectContaining({
          userRows: [],
          paginationItems: [],
          totalCount: 0,
          currentPage: 1,
          totalPages: 0,
          filters: {}
        })
      );
    });

    it("should render find-users page with session filters", async () => {
      // Arrange
      const mockFilters = { email: "test@example.com" };
      mockSession.userManagement = { filters: mockFilters, page: 1 };

      const mockSearchResult = {
        users: [
          {
            userId: "123",
            email: "test@example.com",
            firstName: "Test",
            surname: "User",
            userProvenance: "CFT_IDAM",
            userProvenanceId: "prov123",
            role: "VERIFIED",
            createdDate: new Date(),
            lastSignedInDate: new Date()
          }
        ],
        totalCount: 1,
        currentPage: 1,
        totalPages: 1
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(queries.searchUsers).toHaveBeenCalledWith(mockFilters, 1);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "find-users/index",
        expect.objectContaining({
          userRows: expect.any(Array),
          paginationItems: expect.any(Array),
          totalCount: 1
        })
      );
    });

    it("should show error when no results found with filters", async () => {
      // Arrange
      const mockFilters = { email: "notfound@example.com" };
      mockSession.userManagement = { filters: mockFilters, page: 1 };

      const mockSearchResult = {
        users: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "find-users/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String)
            })
          ])
        })
      );
    });

    it("should not show error when no results and no active filters", async () => {
      // Arrange
      const mockFilters = { email: undefined, userId: undefined, userProvenanceId: undefined, roles: undefined, provenances: undefined };
      mockSession.userManagement = { filters: mockFilters, page: 1 };

      const mockSearchResult = {
        users: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "find-users/index",
        expect.objectContaining({
          errors: undefined
        })
      );
    });

    it("should not show error when no results with empty array filters", async () => {
      // Arrange
      const mockFilters = { email: undefined, userId: undefined, userProvenanceId: undefined, roles: [], provenances: [] };
      mockSession.userManagement = { filters: mockFilters, page: 1 };

      const mockSearchResult = {
        users: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "find-users/index",
        expect.objectContaining({
          errors: undefined
        })
      );
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      vi.mocked(queries.searchUsers).mockRejectedValue(new Error("Database connection failed"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error searching users:",
        expect.objectContaining({
          error: expect.any(Error),
          filters: {},
          page: 1,
          timestamp: expect.any(String)
        })
      );
      expect(mockResponse.render).toHaveBeenCalledWith(
        "find-users/index",
        expect.objectContaining({
          userRows: [],
          totalCount: 0,
          currentPage: 1,
          totalPages: 0
        })
      );

      consoleErrorSpy.mockRestore();
    });

    it("should use page from query string", async () => {
      // Arrange
      mockRequest.query = { page: "3" };
      const mockSearchResult = {
        users: [],
        totalCount: 50,
        currentPage: 3,
        totalPages: 5
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(queries.searchUsers).toHaveBeenCalledWith({}, 3);
    });

    it("should render Welsh content when lng=cy", async () => {
      // Arrange
      mockRequest.query = { lng: "cy" };
      const mockSearchResult = {
        users: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "find-users/index",
        expect.objectContaining({
          lng: "cy"
        })
      );
    });

    it("should build pagination with previous and next links", async () => {
      // Arrange
      const mockSearchResult = {
        users: [],
        totalCount: 50,
        currentPage: 2,
        totalPages: 5
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const renderCall = vi.mocked(mockResponse.render).mock.calls[0][1];
      expect(renderCall.paginationItems).toHaveLength(5); // 5 numbered pages
      expect(renderCall.paginationItems[1].current).toBe(true); // page 2 is current
      expect(renderCall.paginationPrevious).toEqual({ href: "/find-users?page=1" });
      expect(renderCall.paginationNext).toEqual({ href: "/find-users?page=3" });
    });

    it("should build filter tags for all filter types", async () => {
      // Arrange
      const mockFilters = {
        email: "test@example.com",
        userId: "user123",
        userProvenanceId: "prov456",
        roles: ["VERIFIED", "SYSTEM_ADMIN"],
        provenances: ["CFT_IDAM", "SSO"]
      };
      mockSession.userManagement = { filters: mockFilters, page: 1 };

      const mockSearchResult = {
        users: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const renderCall = vi.mocked(mockResponse.render).mock.calls[0][1];
      expect(renderCall.selectedFilterGroups).toHaveLength(5);
      expect(renderCall.hasFilters).toBe(true);
      expect(renderCall.selectedFilterGroups[0].tags[0].label).toBe("test@example.com");
      expect(renderCall.selectedFilterGroups[1].tags[0].label).toBe("user123");
      expect(renderCall.selectedFilterGroups[2].tags[0].label).toBe("prov456");
      expect(renderCall.selectedFilterGroups[3].tags).toHaveLength(2); // roles
      expect(renderCall.selectedFilterGroups[4].tags).toHaveLength(2); // provenances
    });

    it("should generate user rows with manage links", async () => {
      // Arrange
      const mockSearchResult = {
        users: [
          {
            userId: "123",
            email: "user@example.com",
            role: "VERIFIED",
            userProvenance: "CFT_IDAM"
          }
        ],
        totalCount: 1,
        currentPage: 1,
        totalPages: 1
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const renderCall = vi.mocked(mockResponse.render).mock.calls[0][1];
      expect(renderCall.userRows).toHaveLength(1);
      expect(renderCall.userRows[0][0].text).toBe("user@example.com");
      expect(renderCall.userRows[0][1].text).toBe("Verified"); // Localized label
      expect(renderCall.userRows[0][2].text).toBe("CFT IdAM"); // Localized label
      expect(renderCall.userRows[0][3].html).toContain("/manage-user/123");
      expect(renderCall.userRows[0][3].html).toContain("govuk-link");
    });

    it("should generate user rows with Welsh labels when lng=cy", async () => {
      // Arrange
      mockRequest.query = { lng: "cy" };
      const mockSearchResult = {
        users: [
          {
            userId: "123",
            email: "user@example.com",
            role: "SYSTEM_ADMIN",
            userProvenance: "SSO"
          }
        ],
        totalCount: 1,
        currentPage: 1,
        totalPages: 1
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const renderCall = vi.mocked(mockResponse.render).mock.calls[0][1];
      expect(renderCall.userRows).toHaveLength(1);
      expect(renderCall.userRows[0][1].text).toBe("Gweinyddwr System"); // Welsh label for SYSTEM_ADMIN
      expect(renderCall.userRows[0][2].text).toBe("SSO"); // SSO is same in Welsh
    });

    it("should include Welsh language parameter in pagination URLs", async () => {
      // Arrange
      mockRequest.query = { lng: "cy" };
      const mockSearchResult = {
        users: [],
        totalCount: 30,
        currentPage: 1,
        totalPages: 3
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const renderCall = vi.mocked(mockResponse.render).mock.calls[0][1];
      expect(renderCall.paginationItems[0].href).toContain("&lng=cy");
      expect(renderCall.paginationNext.href).toContain("&lng=cy");
    });

    it("should not include previous link on first page", async () => {
      // Arrange
      const mockSearchResult = {
        users: [],
        totalCount: 50,
        currentPage: 1,
        totalPages: 5
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const renderCall = vi.mocked(mockResponse.render).mock.calls[0][1];
      expect(renderCall.paginationPrevious).toBeUndefined();
      expect(renderCall.paginationNext).toEqual({ href: "/find-users?page=2" });
    });

    it("should not include next link on last page", async () => {
      // Arrange
      const mockSearchResult = {
        users: [],
        totalCount: 50,
        currentPage: 5,
        totalPages: 5
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const renderCall = vi.mocked(mockResponse.render).mock.calls[0][1];
      expect(renderCall.paginationPrevious).toEqual({ href: "/find-users?page=4" });
      expect(renderCall.paginationNext).toBeUndefined();
    });
  });

  describe("POST handler", () => {
    it("should save filters to session and redirect", async () => {
      // Arrange
      mockRequest.body = {
        email: "test@example.com",
        roles: ["SYSTEM_ADMIN"]
      };

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockSession.userManagement).toEqual({
        filters: {
          email: "test@example.com",
          userId: undefined,
          userProvenanceId: undefined,
          roles: ["SYSTEM_ADMIN"],
          provenances: undefined
        },
        page: 1
      });
      expect(mockResponse.redirect).toHaveBeenCalledWith("/find-users");
    });

    it("should handle validation errors", async () => {
      // Arrange
      mockRequest.body = {
        userId: "user-with-dashes" // Invalid: contains special characters
      };

      const mockSearchResult = {
        users: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "find-users/index",
        expect.objectContaining({
          errors: expect.any(Array)
        })
      );
    });

    it("should redirect with Welsh language parameter", async () => {
      // Arrange
      mockRequest.query = { lng: "cy" };
      mockRequest.body = { email: "test@example.com" };

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/find-users?lng=cy");
    });

    it("should trim whitespace from text inputs", async () => {
      // Arrange
      mockRequest.body = {
        email: "  test@example.com  ",
        userId: "  user123  ",
        userProvenanceId: "  prov456  "
      };

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockSession.userManagement.filters).toEqual({
        email: "test@example.com",
        userId: "user123",
        userProvenanceId: "prov456",
        roles: undefined,
        provenances: undefined
      });
    });

    it("should convert single role to array", async () => {
      // Arrange
      mockRequest.body = {
        roles: "VERIFIED" // Single value, not array
      };

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockSession.userManagement.filters.roles).toEqual(["VERIFIED"]);
    });

    it("should convert single provenance to array", async () => {
      // Arrange
      mockRequest.body = {
        provenances: "CFT_IDAM" // Single value, not array
      };

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockSession.userManagement.filters.provenances).toEqual(["CFT_IDAM"]);
    });

    it("should initialize session.userManagement if not exists", async () => {
      // Arrange
      mockRequest.body = { email: "test@example.com" };
      mockRequest.session = {}; // No userManagement property

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockRequest.session).toHaveProperty("userManagement");
      expect(mockRequest.session.userManagement).toHaveProperty("filters");
    });

    it("should render Welsh validation errors when lng=cy", async () => {
      // Arrange
      mockRequest.query = { lng: "cy" };
      mockRequest.body = {
        userId: "invalid-user-id"
      };

      const mockSearchResult = {
        users: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0
      };
      vi.mocked(queries.searchUsers).mockResolvedValue(mockSearchResult);

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "find-users/index",
        expect.objectContaining({
          lng: "cy",
          errors: expect.any(Array)
        })
      );
    });
  });
});
