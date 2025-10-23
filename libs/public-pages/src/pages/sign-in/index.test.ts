import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

describe("select-account page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      body: {},
      query: {}
    };
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: {
        locale: "en"
      }
    };
  });

  describe("GET", () => {
    it("should render select-account template", async () => {
      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "sign-in/index",
        expect.objectContaining({
          en: expect.objectContaining({
            title: "How do you want to sign in?"
          }),
          cy: expect.objectContaining({
            title: "Sut hoffech chi fewngofnodi?"
          })
        })
      );
    });

    it("should call render exactly once", async () => {
      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledTimes(1);
    });

    it("should include English translations", async () => {
      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "sign-in/index",
        expect.objectContaining({
          en: expect.objectContaining({
            hmctsLabel: "With a MyHMCTS account",
            commonPlatformLabel: "With a Common Platform account",
            cathLabel: "With a Court and tribunal hearings account",
            continueButton: "Continue"
          })
        })
      );
    });

    it("should include Welsh translations", async () => {
      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "sign-in/index",
        expect.objectContaining({
          cy: expect.objectContaining({
            hmctsLabel: "Gyda chyfrif MyHMCTS",
            commonPlatformLabel: "Gyda chyfrif Common Platform",
            cathLabel: "Gyda chyfrif gwrandawiadau Llys a thribiwnlys",
            continueButton: "Parhau"
          })
        })
      );
    });
  });

  describe("POST", () => {
    describe("valid selections", () => {
      it("should redirect to / for hmcts account", async () => {
        req.body = { accountType: "hmcts" };

        await POST(req as Request, res as Response);

        expect(res.redirect).toHaveBeenCalledWith("/");
        expect(res.redirect).toHaveBeenCalledTimes(1);
      });

      it("should redirect to / for common-platform account", async () => {
        req.body = { accountType: "common-platform" };

        await POST(req as Request, res as Response);

        expect(res.redirect).toHaveBeenCalledWith("/");
        expect(res.redirect).toHaveBeenCalledTimes(1);
      });

      it("should redirect to / for cath account", async () => {
        req.body = { accountType: "cath" };

        await POST(req as Request, res as Response);

        expect(res.redirect).toHaveBeenCalledWith("/");
        expect(res.redirect).toHaveBeenCalledTimes(1);
      });
    });

    describe("validation errors", () => {
      it("should render error when no account selected", async () => {
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            errors: [
              {
                text: "Please select an option",
                href: "#accountType"
              }
            ]
          })
        );
        expect(res.redirect).not.toHaveBeenCalled();
      });

      it("should render error when accountType is undefined", async () => {
        req.body = { accountType: undefined };

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                text: "Please select an option",
                href: "#accountType"
              })
            ])
          })
        );
      });

      it("should render error when accountType is null", async () => {
        req.body = { accountType: null };

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                text: "Please select an option",
                href: "#accountType"
              })
            ])
          })
        );
      });

      it("should render error when accountType is empty string", async () => {
        req.body = { accountType: "" };

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                text: "Please select an option",
                href: "#accountType"
              })
            ])
          })
        );
      });

      it("should render error with invalid account type", async () => {
        req.body = { accountType: "invalid-account" };

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            errors: [
              {
                text: "Please select an option",
                href: "#accountType"
              }
            ]
          })
        );
        expect(res.redirect).not.toHaveBeenCalled();
      });

      it("should include errors when rendering without selection", async () => {
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            errors: expect.any(Array)
          })
        );
      });

      it("should include translations when rendering errors", async () => {
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            en: expect.any(Object),
            cy: expect.any(Object)
          })
        );
      });

      it("should persist selected value on error", async () => {
        req.body = { accountType: "invalid-account" };

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            data: { accountType: "invalid-account" }
          })
        );
      });
    });

    describe("error message format", () => {
      it("should use English error messages by default", async () => {
        res.locals = { locale: "en" };
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            errors: [
              {
                text: "Please select an option",
                href: "#accountType"
              }
            ]
          })
        );
      });

      it("should use Welsh error messages when locale is cy", async () => {
        res.locals = { locale: "cy" };
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            errors: [
              {
                text: "Rhaid dewis opsiwn",
                href: "#accountType"
              }
            ]
          })
        );
      });

      it("should include href pointing to radio group", async () => {
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                href: "#accountType"
              })
            ])
          })
        );
      });

      it("should pass en and cy objects to render", async () => {
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "sign-in/index",
          expect.objectContaining({
            en: expect.any(Object),
            cy: expect.any(Object)
          })
        );
      });
    });
  });
});
