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
  });
});
