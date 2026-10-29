import * as locationModule from "@hmcts/location";
import * as publicationModule from "@hmcts/publication";
import * as listTypeConfigModule from "@hmcts/system-admin-pages";
import { sendPublicationDeletionToThirdParties } from "@hmcts/third-party-subscription-fulfilment";
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
vi.mock("@hmcts/third-party-subscription-fulfilment", () => ({
  sendPublicationDeletionToThirdParties: vi.fn().mockResolvedValue(undefined)
}));

const mockGetLocationById = vi.fn();
const mockGetArtefactsByIds = vi.fn();
const mockDeleteArtefacts = vi.fn();
const mockFindAllListTypes = vi.fn();

vi.mocked(locationModule).getLocationById = mockGetLocationById;
vi.mocked(publicationModule).getArtefactsByIds = mockGetArtefactsByIds;
vi.mocked(publicationModule).deleteArtefacts = mockDeleteArtefacts;
vi.mocked(listTypeConfigModule).findAllListTypes = mockFindAllListTypes;
vi.mocked(listTypeConfigModule).AuditLogAction = {
  REMOVE_LIST: "Remove list"
} as any;

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

    it("should send a third-party OAuth deletion for each removed artefact", async () => {
      // Arrange
      const { POST } = await import("./index.js");
      const handler = POST[1] as (req: Request, res: Response) => Promise<void>;
      vi.mocked(sendPublicationDeletionToThirdParties).mockClear();
      mockDeleteArtefacts.mockResolvedValue(undefined);
      mockGetArtefactsByIds.mockResolvedValue([
        {
          artefactId: "art1",
          locationId: "1",
          listTypeId: 999,
          contentDate: new Date("2025-01-15"),
          displayFrom: null,
          displayTo: null,
          language: "ENGLISH",
          sensitivity: "PUBLIC",
          provenance: "MANUAL_UPLOAD"
        },
        {
          artefactId: "art2",
          locationId: "1",
          listTypeId: 999,
          contentDate: new Date("2025-01-15"),
          displayFrom: null,
          displayTo: null,
          language: "ENGLISH",
          sensitivity: "CLASSIFIED",
          provenance: "MANUAL_UPLOAD"
        }
      ]);
      const mockReq = {
        query: {},
        body: { confirmation: "yes" },
        session: { removalData: { locationId: "1", selectedArtefacts: ["art1", "art2"] }, save: vi.fn((cb) => cb()) }
      } as unknown as Request;
      const mockRes = { redirect: vi.fn() } as unknown as Response;

      // Act
      await handler(mockReq, mockRes);

      // Assert
      expect(sendPublicationDeletionToThirdParties).toHaveBeenCalledTimes(2);
      expect(sendPublicationDeletionToThirdParties).toHaveBeenCalledWith({ artefactId: "art1", listTypeId: 999, sensitivity: "PUBLIC" });
      expect(sendPublicationDeletionToThirdParties).toHaveBeenCalledWith({ artefactId: "art2", listTypeId: 999, sensitivity: "CLASSIFIED" });
    });

    it("should still redirect to success when the third-party OAuth deletion rejects", async () => {
      // Arrange
      const { POST } = await import("./index.js");
      const handler = POST[1] as (req: Request, res: Response) => Promise<void>;
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(sendPublicationDeletionToThirdParties).mockRejectedValueOnce(new Error("OAuth down"));
      mockDeleteArtefacts.mockResolvedValue(undefined);
      mockGetArtefactsByIds.mockResolvedValue([
        {
          artefactId: "art1",
          locationId: "1",
          listTypeId: 999,
          contentDate: new Date("2025-01-15"),
          displayFrom: null,
          displayTo: null,
          language: "ENGLISH",
          sensitivity: "PUBLIC",
          provenance: "MANUAL_UPLOAD"
        }
      ]);
      const mockReq = {
        query: {},
        body: { confirmation: "yes" },
        session: { removalData: { locationId: "1", selectedArtefacts: ["art1"] }, save: vi.fn((cb) => cb()) }
      } as unknown as Request;
      const mockRes = { redirect: vi.fn() } as unknown as Response;

      // Act
      await handler(mockReq, mockRes);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith("/remove-list-success");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Third-party OAuth deletion failed:", { artefactId: "art1", error: "OAuth down" });
      consoleErrorSpy.mockRestore();
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
