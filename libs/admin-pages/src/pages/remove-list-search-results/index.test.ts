import * as locationModule from "@hmcts/location";
import * as publicationModule from "@hmcts/publication";
import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
    INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
    INTERNAL_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL"
  }
}));

vi.mock("@hmcts/location");
vi.mock("@hmcts/publication");

const mockGetLocationById = vi.fn();
const mockGetArtefactsByLocation = vi.fn();

vi.mocked(locationModule).getLocationById = mockGetLocationById;
vi.mocked(publicationModule).getArtefactsByLocation = mockGetArtefactsByLocation;
vi.mocked(publicationModule).mockListTypes = [{ id: 1, englishFriendlyName: "Test List", welshFriendlyName: "Test List Welsh" }];

describe("remove-list-search-results page", () => {
  describe("GET handler", () => {
    it("should redirect to search page if no session data", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1] as (req: Request, res: Response) => Promise<void>;

      const mockReq = {
        query: {},
        session: {}
      } as unknown as Request;

      const mockRes = {
        redirect: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith("/remove-list-search");
    });

    it("should render page with sorted artefacts", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1] as (req: Request, res: Response) => Promise<void>;

      mockGetLocationById.mockReturnValue({
        locationId: 1,
        name: "Test Court",
        welshName: "Test Court Welsh"
      });

      mockGetArtefactsByLocation.mockResolvedValue([
        {
          artefactId: "art1",
          listTypeId: 1,
          contentDate: new Date("2025-01-01"),
          displayFrom: new Date("2025-01-01"),
          displayTo: new Date("2025-12-31"),
          language: "ENGLISH",
          sensitivity: "PUBLIC"
        }
      ]);

      const mockReq = {
        query: {},
        session: {
          removalData: {
            locationId: "1"
          }
        }
      } as unknown as Request;

      const mockRes = {
        render: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith(
        "remove-list-search-results/index",
        expect.objectContaining({
          artefactRows: expect.any(Array),
          resultCount: 1,
          sortBy: "contentDate",
          order: "desc"
        })
      );
    });

    it("should sort by custom column when specified", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1] as (req: Request, res: Response) => Promise<void>;

      mockGetLocationById.mockReturnValue({
        locationId: 1,
        name: "Test Court",
        welshName: "Test Court Welsh"
      });

      mockGetArtefactsByLocation.mockResolvedValue([
        {
          artefactId: "art1",
          listTypeId: 1,
          contentDate: new Date("2025-01-01"),
          displayFrom: new Date("2025-01-01"),
          displayTo: new Date("2025-12-31"),
          language: "ENGLISH",
          sensitivity: "PUBLIC"
        },
        {
          artefactId: "art2",
          listTypeId: 1,
          contentDate: new Date("2025-02-01"),
          displayFrom: new Date("2025-02-01"),
          displayTo: new Date("2025-12-31"),
          language: "WELSH",
          sensitivity: "PRIVATE"
        }
      ]);

      const mockReq = {
        query: { sort: "language", order: "asc" },
        session: {
          removalData: {
            locationId: "1"
          }
        }
      } as unknown as Request;

      const mockRes = {
        render: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith(
        "remove-list-search-results/index",
        expect.objectContaining({
          sortBy: "language",
          order: "asc"
        })
      );
    });
  });

  describe("POST handler", () => {
    it("should show error when no artefacts selected", async () => {
      const { POST } = await import("./index.js");
      const handler = POST[1] as (req: Request, res: Response) => Promise<void>;

      mockGetLocationById.mockReturnValue({
        locationId: 1,
        name: "Test Court",
        welshName: "Test Court Welsh"
      });

      mockGetArtefactsByLocation.mockResolvedValue([
        {
          artefactId: "art1",
          listTypeId: 1,
          contentDate: new Date("2025-01-01"),
          displayFrom: new Date("2025-01-01"),
          displayTo: new Date("2025-12-31"),
          language: "ENGLISH",
          sensitivity: "PUBLIC"
        }
      ]);

      const mockReq = {
        query: {},
        body: {},
        session: {
          removalData: {
            locationId: "1"
          }
        }
      } as unknown as Request;

      const mockRes = {
        render: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith(
        "remove-list-search-results/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              href: "#artefacts"
            })
          ])
        })
      );
    });

    it("should redirect to confirmation when artefacts selected", async () => {
      const { POST } = await import("./index.js");
      const handler = POST[1] as (req: Request, res: Response) => Promise<void>;

      const mockReq = {
        query: {},
        body: { artefacts: ["art1", "art2"] },
        session: {
          removalData: {
            locationId: "1"
          },
          save: vi.fn((cb) => cb())
        }
      } as unknown as Request;

      const mockRes = {
        redirect: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockReq.session.removalData.selectedArtefacts).toEqual(["art1", "art2"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/remove-list-confirmation");
    });
  });
});
