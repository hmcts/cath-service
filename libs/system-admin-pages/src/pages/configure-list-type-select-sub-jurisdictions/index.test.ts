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

vi.mock("../../list-type/validation.js", () => ({
  validateSubJurisdictions: vi.fn()
}));

const { GET, POST } = await import("./index.js");
const { findAllSubJurisdictions } = await import("../../list-type/queries.js");
const { validateSubJurisdictions } = await import("../../list-type/validation.js");

describe("select-sub-jurisdictions page", () => {
  const mockSubJurisdictions = [
    { subJurisdictionId: 1, name: "England", welshName: "Lloegr" },
    { subJurisdictionId: 2, name: "Wales", welshName: "Cymru" }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findAllSubJurisdictions).mockResolvedValue(mockSubJurisdictions as any);
  });

  describe("GET", () => {
    it("should render page with English content", async () => {
      const session: any = {
        configureListType: {
          name: "TEST",
          subJurisdictionIds: [1]
        }
      };
      const req = { session, query: {} } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(findAllSubJurisdictions).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "configure-list-type-select-sub-jurisdictions/index",
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ value: "1", text: "England", checked: true }),
            expect.objectContaining({ value: "2", text: "Wales", checked: false })
          ])
        })
      );
    });

    it("should render page with Welsh content when lng=cy", async () => {
      const session: any = { configureListType: { name: "TEST", subJurisdictionIds: [] } };
      const req = { session, query: { lng: "cy" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "configure-list-type-select-sub-jurisdictions/index",
        expect.objectContaining({
          items: expect.arrayContaining([expect.objectContaining({ text: "Lloegr" }), expect.objectContaining({ text: "Cymru" })])
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

    it("should show checked items based on session data", async () => {
      const session: any = {
        configureListType: {
          name: "TEST",
          subJurisdictionIds: [1, 2]
        }
      };
      const req = { session, query: {} } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "configure-list-type-select-sub-jurisdictions/index",
        expect.objectContaining({
          items: expect.arrayContaining([expect.objectContaining({ checked: true }), expect.objectContaining({ checked: true })])
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
    });

    it("should validate and redirect to preview on success", async () => {
      vi.mocked(validateSubJurisdictions).mockReturnValue([]);
      const session: any = { configureListType: { name: "TEST" } };
      const req = { session, query: {}, body: { subJurisdictions: ["1", "2"] } } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(validateSubJurisdictions).toHaveBeenCalledWith([1, 2]);
      expect(session.configureListType.subJurisdictionIds).toEqual([1, 2]);
      expect(res.redirect).toHaveBeenCalledWith("/configure-list-type-preview");
    });

    it("should handle single sub-jurisdiction selection", async () => {
      vi.mocked(validateSubJurisdictions).mockReturnValue([]);
      const session: any = { configureListType: { name: "TEST" } };
      const req = { session, query: {}, body: { subJurisdictions: "1" } } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(session.configureListType.subJurisdictionIds).toEqual([1]);
      expect(res.redirect).toHaveBeenCalledWith("/configure-list-type-preview");
    });

    it("should handle validation errors", async () => {
      const errors = [{ field: "subJurisdictions", message: "Select at least one sub-jurisdiction", href: "#subJurisdictions" }];
      vi.mocked(validateSubJurisdictions).mockReturnValue(errors);
      const session: any = { configureListType: { name: "TEST" } };
      const req = { session, query: {}, body: { subJurisdictions: [] } } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "configure-list-type-select-sub-jurisdictions/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            subJurisdictions: { text: "Select at least one sub-jurisdiction" }
          }),
          errorList: expect.any(Array)
        })
      );
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should preserve user selections when showing errors", async () => {
      const errors = [{ field: "subJurisdictions", message: "Error", href: "#subJurisdictions" }];
      vi.mocked(validateSubJurisdictions).mockReturnValue(errors);
      const session: any = { configureListType: { name: "TEST" } };
      const req = { session, query: {}, body: { subJurisdictions: ["1"] } } as unknown as Request;
      const res = { render: vi.fn(), redirect: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "configure-list-type-select-sub-jurisdictions/index",
        expect.objectContaining({
          items: expect.arrayContaining([expect.objectContaining({ checked: true })])
        })
      );
    });
  });
});
