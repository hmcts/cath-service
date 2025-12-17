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
  findListTypeById: vi.fn(),
  findListTypeByName: vi.fn()
}));

vi.mock("../../list-type/validation.js", () => ({
  validateListTypeDetails: vi.fn()
}));

const { GET, POST } = await import("./index.js");
const { findListTypeById, findListTypeByName } = await import("../../list-type/queries.js");
const { validateListTypeDetails } = await import("../../list-type/validation.js");

describe("enter-details page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render page with English content", async () => {
      const req = { session: {}, query: {} } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith("configure-list-type-enter-details/index", expect.objectContaining({ isEdit: false }));
    });

    it("should render page with Welsh content when lng=cy", async () => {
      const req = { session: {}, query: { lng: "cy" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalled();
    });

    it("should populate form from session data", async () => {
      const sessionData = {
        name: "TEST_LIST",
        friendlyName: "Test",
        welshFriendlyName: "Prawf",
        shortenedFriendlyName: "Test",
        url: "/test",
        defaultSensitivity: "Public",
        allowedProvenance: ["CFT_IDAM"],
        isNonStrategic: false
      };
      const req = { session: { configureListType: sessionData }, query: {} } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith("configure-list-type-enter-details/index", expect.objectContaining({ data: sessionData }));
    });

    it("should load existing list type when id provided", async () => {
      const existingData = {
        id: 1,
        name: "EXISTING",
        friendlyName: "Existing",
        welshFriendlyName: "Bodoli",
        shortenedFriendlyName: "Exist",
        url: "/exist",
        defaultSensitivity: "Private",
        allowedProvenance: "CFT_IDAM,B2C",
        isNonStrategic: true,
        subJurisdictions: [{ subJurisdictionId: 1 }, { subJurisdictionId: 2 }]
      };
      vi.mocked(findListTypeById).mockResolvedValue(existingData as any);
      const req = { session: {}, query: { id: "1" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(findListTypeById).toHaveBeenCalledWith(1);
      expect(res.render).toHaveBeenCalledWith("configure-list-type-enter-details/index", expect.objectContaining({ isEdit: true }));
    });

    it("should set checked provenance from form data", async () => {
      const sessionData = { allowedProvenance: ["CFT_IDAM", "B2C"] };
      const req = { session: { configureListType: sessionData }, query: {} } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "configure-list-type-enter-details/index",
        expect.objectContaining({
          checkedProvenance: { CFT_IDAM: true, B2C: true, COMMON_PLATFORM: false }
        })
      );
    });
  });

  describe("POST", () => {
    it("should validate and redirect on success", async () => {
      vi.mocked(validateListTypeDetails).mockReturnValue([]);
      vi.mocked(findListTypeByName).mockResolvedValue(null);
      const req = {
        session: {},
        query: {},
        body: {
          name: "NEW",
          friendlyName: "New",
          welshFriendlyName: "Newydd",
          shortenedFriendlyName: "New",
          url: "/new",
          defaultSensitivity: "Public",
          allowedProvenance: ["CFT_IDAM"],
          isNonStrategic: "true"
        }
      } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(validateListTypeDetails).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith("/configure-list-type-select-sub-jurisdictions");
    });

    it("should handle validation errors", async () => {
      const errors = [{ field: "name", message: "Enter a value for name", href: "#name" }];
      vi.mocked(validateListTypeDetails).mockReturnValue(errors);
      const req = { session: {}, query: {}, body: {} } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.render).toHaveBeenCalledWith("configure-list-type-enter-details/index", expect.objectContaining({ errors: expect.any(Object) }));
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should check for duplicate names", async () => {
      vi.mocked(validateListTypeDetails).mockReturnValue([]);
      vi.mocked(findListTypeByName).mockResolvedValue({ id: 2, name: "DUPLICATE" } as any);
      const req = {
        session: {},
        query: {},
        body: { name: "DUPLICATE", allowedProvenance: ["CFT_IDAM"], isNonStrategic: "false" }
      } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.render).toHaveBeenCalledWith("configure-list-type-enter-details/index", expect.objectContaining({ errorList: expect.any(Array) }));
    });

    it("should allow duplicate name when editing same list type", async () => {
      vi.mocked(validateListTypeDetails).mockReturnValue([]);
      vi.mocked(findListTypeByName).mockResolvedValue({ id: 1, name: "SAME" } as any);
      const req = {
        session: { configureListType: { editId: 1 } },
        query: {},
        body: { name: "SAME", allowedProvenance: ["CFT_IDAM"], isNonStrategic: "false" }
      } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/configure-list-type-select-sub-jurisdictions");
    });

    it("should handle single provenance value", async () => {
      vi.mocked(validateListTypeDetails).mockReturnValue([]);
      vi.mocked(findListTypeByName).mockResolvedValue(null);
      const req = {
        session: {},
        query: {},
        body: { name: "TEST", allowedProvenance: "CFT_IDAM", isNonStrategic: "false" }
      } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.redirect).toHaveBeenCalled();
    });

    it("should preserve session data on success", async () => {
      vi.mocked(validateListTypeDetails).mockReturnValue([]);
      vi.mocked(findListTypeByName).mockResolvedValue(null);
      const session: any = { configureListType: { subJurisdictionIds: [1, 2], editId: 3 } };
      const req = {
        session,
        query: {},
        body: { name: "TEST", allowedProvenance: ["CFT_IDAM"], isNonStrategic: "false" }
      } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(session.configureListType.subJurisdictionIds).toEqual([1, 2]);
      expect(session.configureListType.editId).toBe(3);
    });
  });
});
