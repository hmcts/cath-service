import type { Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

// Helper to call handler arrays (middleware chain)
async function callHandler(handlers: RequestHandler | RequestHandler[], req: Request, res: Response) {
  if (Array.isArray(handlers)) {
    // Call middleware chain
    for (let i = 0; i < handlers.length; i++) {
      await new Promise<void>((resolve, reject) => {
        const handler = handlers[i];
        const next = (err?: any) => {
          if (err) reject(err);
          else resolve();
        };
        const result = handler(req, res, next);
        // If handler returns a promise, wait for it
        if (result instanceof Promise) {
          result.then(() => resolve()).catch(reject);
        }
      });
    }
  } else {
    const result = handlers(req, res, () => {});
    if (result instanceof Promise) {
      await result;
    }
  }
}

// Mock the modules
vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
    INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
    INTERNAL_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL"
  }
}));

describe("manual-upload-success page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render success page when uploadConfirmed flag is set", async () => {
      const session = {
        uploadConfirmed: true
      };

      const req = {
        query: {},
        session
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload-success/index",
        expect.objectContaining({
          pageTitle: "Manual upload - File upload successful - Court and tribunal hearings - GOV.UK",
          title: "File upload successful",
          uploadedMessage: "Your file has been uploaded",
          nextStepsHeading: "What do you want to do next?",
          uploadAnotherLink: "Upload another file",
          removeFileLink: "Remove file",
          homeLink: "Home",
          navigation: {
            signIn: "Sign in",
            signOut: "Sign out"
          },
          hideLanguageToggle: true
        })
      );
      expect(req.session.uploadConfirmed).toBe(true);
    });

    it("should render success page with Welsh content", async () => {
      const session = {
        uploadConfirmed: true
      };

      const req = {
        query: { lng: "cy" },
        session
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload-success/index",
        expect.objectContaining({
          pageTitle: "Uwchlwytho â llaw - Wedi llwyddo i uwchlwytho ffeiliau - Gwrandawiadau llys a thribiwnlys - GOV.UK",
          title: "Wedi llwyddo i uwchlwytho ffeiliau",
          uploadedMessage: "Mae eich ffeil wedi'i huwchlwytho",
          nextStepsHeading: "Beth yr ydych eisiau ei wneud nesaf?",
          uploadAnotherLink: "uwchlwytho ffeil arall",
          removeFileLink: "Dileu ffeil",
          homeLink: "Tudalen hafan",
          navigation: {
            signIn: "Mewngofnodi",
            signOut: "Allgofnodi"
          },
          hideLanguageToggle: true
        })
      );
    });

    it("should redirect to manual-upload when uploadConfirmed flag is not set", async () => {
      const session = {};

      const req = {
        query: {},
        session
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/manual-upload");
      expect(res.render).not.toHaveBeenCalled();
    });

    it("should redirect to manual-upload when session is undefined", async () => {
      const req = {
        query: {}
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/manual-upload");
      expect(res.render).not.toHaveBeenCalled();
    });

    it("should preserve uploadConfirmed flag after rendering", async () => {
      const session = {
        uploadConfirmed: true
      };

      const req = {
        query: {},
        session
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(req.session.uploadConfirmed).toBe(true);
    });
  });
});
