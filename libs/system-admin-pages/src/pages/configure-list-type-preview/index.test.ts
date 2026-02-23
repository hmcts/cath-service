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

vi.mock("../../list-type/queries.js", () => ({
  findAllSubJurisdictions: vi.fn()
}));

vi.mock("../../list-type/service.js", () => ({
  saveListType: vi.fn()
}));

const { GET, POST } = await import("./index.js");
const { findAllSubJurisdictions } = await import("../../list-type/queries.js");
const { saveListType } = await import("../../list-type/service.js");

describe("preview page", () => {
  const mockSubJurisdictions = [
    { subJurisdictionId: 1, name: "England", welshName: "Lloegr" },
    { subJurisdictionId: 2, name: "Wales", welshName: "Cymru" }
  ];

  const mockSessionData = {
    name: "TEST_LIST",
    friendlyName: "Test List",
    welshFriendlyName: "Rhestr Prawf",
    shortenedFriendlyName: "Test",
    url: "/test",
    defaultSensitivity: "Public",
    allowedProvenance: ["CFT_IDAM"],
    isNonStrategic: false,
    subJurisdictionIds: [1, 2]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findAllSubJurisdictions).mockResolvedValue(mockSubJurisdictions as any);
  });

  describe("GET", () => {
    it("should render page with English content", async () => {
      const session: any = { configureListType: mockSessionData };
      const req = { session, query: {} } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(findAllSubJurisdictions).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "configure-list-type-preview/index",
        expect.objectContaining({
          data: mockSessionData,
          subJurisdictionsText: "England, Wales"
        })
      );
    });

    it("should render page with Welsh content when lng=cy", async () => {
      const session: any = { configureListType: mockSessionData };
      const req = { session, query: { lng: "cy" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "configure-list-type-preview/index",
        expect.objectContaining({
          subJurisdictionsText: "Lloegr, Cymru"
        })
      );
    });

    it("should redirect to enter-details if no session data", async () => {
      const req = { session: {}, query: {} } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/configure-list-type-enter-details");
      expect(res.render).not.toHaveBeenCalled();
    });

    it("should format sub-jurisdictions as comma-separated text", async () => {
      const session: any = { configureListType: { ...mockSessionData, subJurisdictionIds: [1] } };
      const req = { session, query: {} } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "configure-list-type-preview/index",
        expect.objectContaining({
          subJurisdictionsText: "England"
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to enter-details if no session data", async () => {
      const req = { session: {}, query: {}, body: {} } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/configure-list-type-enter-details");
      expect(saveListType).not.toHaveBeenCalled();
    });

    it("should save list type and redirect to success", async () => {
      vi.mocked(saveListType).mockResolvedValue({} as any);
      const session: any = { configureListType: mockSessionData };
      const req = { session, query: {}, body: {} } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(saveListType).toHaveBeenCalledWith(
        {
          name: "TEST_LIST",
          friendlyName: "Test List",
          welshFriendlyName: "Rhestr Prawf",
          shortenedFriendlyName: "Test",
          url: "/test",
          defaultSensitivity: "Public",
          allowedProvenance: ["CFT_IDAM"],
          isNonStrategic: false,
          subJurisdictionIds: [1, 2]
        },
        undefined
      );
      expect(session.configureListType).toBeUndefined();
      expect(res.redirect).toHaveBeenCalledWith(303, "/configure-list-type-success");
    });

    it("should pass editId when updating existing list type", async () => {
      vi.mocked(saveListType).mockResolvedValue({} as any);
      const session: any = { configureListType: { ...mockSessionData, editId: 5 } };
      const req = { session, query: {}, body: {} } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(saveListType).toHaveBeenCalledWith(expect.any(Object), 5);
    });

    it("should clear session data after successful save", async () => {
      vi.mocked(saveListType).mockResolvedValue({} as any);
      const session: any = { configureListType: mockSessionData };
      const req = { session, query: {}, body: {} } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(session.configureListType).toBeUndefined();
    });

    it("should use 303 redirect status code", async () => {
      vi.mocked(saveListType).mockResolvedValue({} as any);
      const session: any = { configureListType: mockSessionData };
      const req = { session, query: {}, body: {} } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.redirect).toHaveBeenCalledWith(303, "/configure-list-type-success");
    });

    it("should handle save errors gracefully", async () => {
      const error = new Error("Database error");
      vi.mocked(saveListType).mockRejectedValue(error);
      const session: any = { configureListType: mockSessionData };
      const req = { session, query: {}, body: {} } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "configure-list-type-preview/index",
        expect.objectContaining({
          error: "Database error"
        })
      );
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should preserve session data when save fails", async () => {
      vi.mocked(saveListType).mockRejectedValue(new Error("Failed"));
      const session: any = { configureListType: mockSessionData };
      const req = { session, query: {}, body: {} } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(session.configureListType).toEqual(mockSessionData);
    });

    it("should handle non-Error objects in catch", async () => {
      vi.mocked(saveListType).mockRejectedValue("String error");
      const session: any = { configureListType: mockSessionData };
      const req = { session, query: {}, body: {} } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "configure-list-type-preview/index",
        expect.objectContaining({
          error: "Failed to save list type"
        })
      );
    });
  });
});
