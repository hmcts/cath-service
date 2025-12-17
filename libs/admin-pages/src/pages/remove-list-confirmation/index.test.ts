import * as locationModule from "@hmcts/location";
import * as publicationModule from "@hmcts/publication";
import * as listTypeConfigModule from "@hmcts/system-admin-pages";
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
vi.mock("@hmcts/system-admin-pages");

const mockGetLocationById = vi.fn();
const mockGetArtefactsByIds = vi.fn();
const mockDeleteArtefacts = vi.fn();
const mockFindAllListTypes = vi.fn();

vi.mocked(locationModule).getLocationById = mockGetLocationById;
vi.mocked(publicationModule).getArtefactsByIds = mockGetArtefactsByIds;
vi.mocked(publicationModule).deleteArtefacts = mockDeleteArtefacts;
vi.mocked(listTypeConfigModule).findAllListTypes = mockFindAllListTypes;

mockFindAllListTypes.mockResolvedValue([{ id: 1, friendlyName: "Test List", welshFriendlyName: "Test List Welsh" }]);

describe("remove-list-confirmation page", () => {
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

    it("should render page with artefact details", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1] as (req: Request, res: Response) => Promise<void>;

      mockGetLocationById.mockReturnValue({
        locationId: 1,
        name: "Test Court",
        welshName: "Test Court Welsh"
      });

      mockGetArtefactsByIds.mockResolvedValue([
        {
          artefactId: "art1",
          locationId: "1",
          listTypeId: 1,
          contentDate: new Date("2025-01-15"),
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
            locationId: "1",
            selectedArtefacts: ["art1"]
          }
        }
      } as unknown as Request;

      const mockRes = {
        render: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith(
        "remove-list-confirmation/index",
        expect.objectContaining({
          artefactData: expect.arrayContaining([
            expect.objectContaining({
              listType: "Test List",
              court: "Test Court",
              language: "English",
              sensitivity: "Public"
            })
          ])
        })
      );
    });
  });

  describe("POST handler", () => {
    it("should show error when no option selected", async () => {
      const { POST } = await import("./index.js");
      const handler = POST[1] as (req: Request, res: Response) => Promise<void>;

      mockGetLocationById.mockReturnValue({
        locationId: 1,
        name: "Test Court",
        welshName: "Test Court Welsh"
      });

      mockGetArtefactsByIds.mockResolvedValue([
        {
          artefactId: "art1",
          locationId: "1",
          listTypeId: 1,
          contentDate: new Date("2025-01-15"),
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
            locationId: "1",
            selectedArtefacts: ["art1"]
          }
        }
      } as unknown as Request;

      const mockRes = {
        render: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith(
        "remove-list-confirmation/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              href: "#confirmation"
            })
          ])
        })
      );
    });

    it("should redirect back to results when user selects no", async () => {
      const { POST } = await import("./index.js");
      const handler = POST[1] as (req: Request, res: Response) => Promise<void>;

      const mockReq = {
        query: {},
        body: { confirmation: "no" },
        session: {
          removalData: {
            locationId: "1",
            selectedArtefacts: ["art1"]
          }
        }
      } as unknown as Request;

      const mockRes = {
        redirect: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith("/remove-list-search-results");
    });

    it("should delete artefacts and redirect to success when user confirms", async () => {
      const { POST } = await import("./index.js");
      const handler = POST[1] as (req: Request, res: Response) => Promise<void>;

      mockDeleteArtefacts.mockResolvedValue(undefined);

      const mockReq = {
        query: {},
        body: { confirmation: "yes" },
        session: {
          removalData: {
            locationId: "1",
            selectedArtefacts: ["art1"]
          },
          save: vi.fn((cb) => cb())
        }
      } as unknown as Request;

      const mockRes = {
        redirect: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockDeleteArtefacts).toHaveBeenCalledWith(["art1"]);
      expect(mockReq.session.removalData).toBeUndefined();
      expect(mockReq.session.removalSuccess).toBe(true);
      expect(mockRes.redirect).toHaveBeenCalledWith("/remove-list-success");
    });

    it("should show error when deletion fails", async () => {
      const { POST } = await import("./index.js");
      const handler = POST[1] as (req: Request, res: Response) => Promise<void>;

      mockGetLocationById.mockReturnValue({
        locationId: 1,
        name: "Test Court",
        welshName: "Test Court Welsh"
      });

      mockGetArtefactsByIds.mockResolvedValue([
        {
          artefactId: "art1",
          locationId: "1",
          listTypeId: 1,
          contentDate: new Date("2025-01-15"),
          displayFrom: new Date("2025-01-01"),
          displayTo: new Date("2025-12-31"),
          language: "ENGLISH",
          sensitivity: "PUBLIC"
        }
      ]);

      mockDeleteArtefacts.mockRejectedValue(new Error("Database error"));

      const mockReq = {
        query: {},
        body: { confirmation: "yes" },
        session: {
          removalData: {
            locationId: "1",
            selectedArtefacts: ["art1"]
          }
        }
      } as unknown as Request;

      const mockRes = {
        render: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith(
        "remove-list-confirmation/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("error")
            })
          ])
        })
      );
    });
  });
});
