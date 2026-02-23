import type { Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function callHandler(handlers: RequestHandler | RequestHandler[], req: Request, res: Response) {
  if (Array.isArray(handlers)) {
    for (const handler of handlers) {
      await new Promise<void>((resolve, reject) => {
        const next = (err?: any) => (err ? reject(err) : resolve());
        const result = handler(req, res, next);
        if (result instanceof Promise) {
          result.then(() => resolve()).catch(reject);
        }
      });
    }
  } else {
    const result = handlers(req, res, () => {});
    if (result instanceof Promise) await result;
  }
}

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

const mockFindListTypeById = vi.fn();
const mockHasArtefactsForListType = vi.fn();
const mockSoftDeleteListType = vi.fn();

vi.mock("../../list-type/queries.js", () => ({
  findListTypeById: mockFindListTypeById,
  hasArtefactsForListType: mockHasArtefactsForListType,
  softDeleteListType: mockSoftDeleteListType
}));

const { GET, POST } = await import("./index.js");

describe("delete-list-type page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render page with list type details", async () => {
      const req = {
        query: { id: "1" }
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      const mockListType = {
        id: 1,
        name: "TEST_LIST",
        friendlyName: "Test List"
      };

      mockFindListTypeById.mockResolvedValue(mockListType);

      await callHandler(GET, req, res);

      expect(mockFindListTypeById).toHaveBeenCalledWith(1);
      expect(res.render).toHaveBeenCalledWith(
        "delete-list-type/index",
        expect.objectContaining({
          listTypeName: "Test List",
          data: {}
        })
      );
    });

    it("should use name when friendlyName is not available", async () => {
      const req = {
        query: { id: "1" }
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      const mockListType = {
        id: 1,
        name: "TEST_LIST",
        friendlyName: null
      };

      mockFindListTypeById.mockResolvedValue(mockListType);

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "delete-list-type/index",
        expect.objectContaining({
          listTypeName: "TEST_LIST"
        })
      );
    });

    it("should return 400 for invalid id", async () => {
      const req = {
        query: { id: "invalid" }
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        "delete-list-type/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              href: "#confirmDelete"
            })
          ])
        })
      );
    });

    it("should return 404 when list type not found", async () => {
      const req = {
        query: { id: "999" }
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      mockFindListTypeById.mockResolvedValue(null);

      await callHandler(GET, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith(
        "delete-list-type/index",
        expect.objectContaining({
          errors: expect.any(Array)
        })
      );
    });

    it("should render Welsh content when lng=cy", async () => {
      const req = {
        query: { id: "1", lng: "cy" }
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      const mockListType = {
        id: 1,
        name: "TEST_LIST",
        friendlyName: "Test List"
      };

      mockFindListTypeById.mockResolvedValue(mockListType);

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "delete-list-type/index",
        expect.objectContaining({
          listTypeName: "Test List"
        })
      );
    });
  });

  describe("POST", () => {
    it("should show error when no confirmation selected", async () => {
      const req = {
        query: { id: "1" },
        body: {}
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      const mockListType = {
        id: 1,
        name: "TEST_LIST",
        friendlyName: "Test List"
      };

      mockFindListTypeById.mockResolvedValue(mockListType);

      await callHandler(POST, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "delete-list-type/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              href: "#confirmDelete"
            })
          ])
        })
      );
    });

    it("should redirect to view-list-types when user selects no", async () => {
      const req = {
        query: { id: "1" },
        body: { confirmDelete: "no" }
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      const mockListType = {
        id: 1,
        name: "TEST_LIST",
        friendlyName: "Test List"
      };

      mockFindListTypeById.mockResolvedValue(mockListType);

      await callHandler(POST, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/view-list-types");
    });

    it("should show error when list type has artefacts", async () => {
      const req = {
        query: { id: "1" },
        body: { confirmDelete: "yes" }
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      const mockListType = {
        id: 1,
        name: "TEST_LIST",
        friendlyName: "Test List"
      };

      mockFindListTypeById.mockResolvedValue(mockListType);
      mockHasArtefactsForListType.mockResolvedValue(true);

      await callHandler(POST, req, res);

      expect(mockHasArtefactsForListType).toHaveBeenCalledWith(1);
      expect(res.render).toHaveBeenCalledWith(
        "delete-list-type/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              href: "#confirmDelete"
            })
          ])
        })
      );
    });

    it("should soft delete and redirect to success page when confirmed and no artefacts", async () => {
      const req = {
        query: { id: "1" },
        body: { confirmDelete: "yes" }
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      const mockListType = {
        id: 1,
        name: "TEST_LIST",
        friendlyName: "Test List"
      };

      mockFindListTypeById.mockResolvedValue(mockListType);
      mockHasArtefactsForListType.mockResolvedValue(false);
      mockSoftDeleteListType.mockResolvedValue({});

      await callHandler(POST, req, res);

      expect(mockSoftDeleteListType).toHaveBeenCalledWith(1);
      expect(res.redirect).toHaveBeenCalledWith("/delete-list-type-success");
    });

    it("should preserve language parameter in redirects", async () => {
      const req = {
        query: { id: "1", lng: "cy" },
        body: { confirmDelete: "yes" }
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      const mockListType = {
        id: 1,
        name: "TEST_LIST",
        friendlyName: "Test List"
      };

      mockFindListTypeById.mockResolvedValue(mockListType);
      mockHasArtefactsForListType.mockResolvedValue(false);
      mockSoftDeleteListType.mockResolvedValue({});

      await callHandler(POST, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/delete-list-type-success?lng=cy");
    });

    it("should return 400 for invalid id in POST", async () => {
      const req = {
        query: { id: "invalid" },
        body: { confirmDelete: "yes" }
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 when list type not found in POST", async () => {
      const req = {
        query: { id: "999" },
        body: { confirmDelete: "yes" }
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis()
      } as unknown as Response;

      mockFindListTypeById.mockResolvedValue(null);

      await callHandler(POST, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
