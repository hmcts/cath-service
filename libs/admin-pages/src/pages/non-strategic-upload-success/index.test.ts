import type { Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

async function callHandler(handlers: RequestHandler | RequestHandler[], req: Request, res: Response) {
  if (Array.isArray(handlers)) {
    for (let i = 0; i < handlers.length; i++) {
      await new Promise<void>((resolve, reject) => {
        const handler = handlers[i];
        const next = (err?: any) => {
          if (err) reject(err);
          else resolve();
        };
        const result = handler(req, res, next);
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

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
    INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
    INTERNAL_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL"
  }
}));

describe("non-strategic-upload-success page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render success page when nonStrategicUploadConfirmed flag is set", async () => {
      const session = {
        nonStrategicUploadConfirmed: true
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
        "non-strategic-upload-success/index",
        expect.objectContaining({
          pageTitle: "Non-strategic upload - File upload successful - Court and tribunal hearings - GOV.UK",
          title: "File upload successful",
          uploadedMessage: "Your file has been uploaded",
          nextStepsHeading: "What do you want to do next?",
          uploadAnotherLink: "Upload another file",
          removeFileLink: "Remove file",
          homeLink: "Home",
          hideLanguageToggle: true
        })
      );
      expect(req.session.nonStrategicUploadConfirmed).toBe(true);
      expect(req.session.nonStrategicSuccessPageViewed).toBe(true);
    });

    it("should render success page with Welsh content", async () => {
      const session = {
        nonStrategicUploadConfirmed: true
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
        "non-strategic-upload-success/index",
        expect.objectContaining({
          pageTitle: "Uwchlwytho â llaw - Wedi llwyddo i uwchlwytho ffeiliau - Gwrandawiadau llys a thribiwnlys - GOV.UK",
          title: "Wedi llwyddo i uwchlwytho ffeiliau",
          uploadedMessage: "Mae eich ffeil wedi'i huwchlwytho",
          nextStepsHeading: "Beth yr ydych eisiau ei wneud nesaf?",
          uploadAnotherLink: "uwchlwytho ffeil arall",
          removeFileLink: "Dileu ffeil",
          homeLink: "Tudalen hafan",
          hideLanguageToggle: true
        })
      );
    });

    it("should redirect to non-strategic-upload when nonStrategicUploadConfirmed flag is not set", async () => {
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

      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload");
      expect(res.render).not.toHaveBeenCalled();
    });

    it("should redirect to non-strategic-upload when session is undefined", async () => {
      const req = {
        query: {}
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload");
      expect(res.render).not.toHaveBeenCalled();
    });

    it("should clear flags and redirect on second view", async () => {
      const session = {
        nonStrategicUploadConfirmed: true,
        nonStrategicSuccessPageViewed: true,
        nonStrategicViewedLanguage: "en" as "en" | "cy"
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

      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload");
      expect(req.session.nonStrategicUploadConfirmed).toBeUndefined();
      expect(req.session.nonStrategicSuccessPageViewed).toBeUndefined();
      expect(req.session.nonStrategicViewedLanguage).toBeUndefined();
    });

    it("should clear flags and redirect when page already viewed without language change", async () => {
      const session = {
        nonStrategicUploadConfirmed: true,
        nonStrategicSuccessPageViewed: true
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

      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload");
      expect(req.session.nonStrategicUploadConfirmed).toBeUndefined();
      expect(req.session.nonStrategicSuccessPageViewed).toBeUndefined();
    });

    it("should handle language toggle with lng parameter", async () => {
      const session = {
        nonStrategicUploadConfirmed: true
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

      expect(res.render).toHaveBeenCalledWith("non-strategic-upload-success/index", expect.objectContaining({ hideLanguageToggle: true }));
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });
});
