import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./view-option.js";

describe("view-option page", () => {
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
    it("should render view-option template", async () => {
      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "view-option",
        expect.objectContaining({
          en: expect.objectContaining({
            title: "What do you want to do?"
          }),
          cy: expect.objectContaining({
            title: "Beth ydych chi eisiau ei wneud?"
          }),
          backLink: "/"
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
        "view-option",
        expect.objectContaining({
          en: expect.objectContaining({
            courtTribunalLabel: "<strong>Find a court or tribunal</strong>",
            sjpCaseLabel: "<strong>Find a Single Justice Procedure case</strong>",
            continueButton: "Continue"
          })
        })
      );
    });

    it("should include Welsh translations", async () => {
      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "view-option",
        expect.objectContaining({
          cy: expect.objectContaining({
            courtTribunalLabel: "<strong>Dod o hyd i lys neu dribiwnlys</strong>",
            sjpCaseLabel: "<strong>Dod o hyd i achos Gweithdrefn Un Ynad</strong>",
            continueButton: "Parhau"
          })
        })
      );
    });
  });

  describe("POST", () => {
    describe("valid selections", () => {
      it("should redirect to /search for court-tribunal option", async () => {
        req.body = { viewOption: "court-tribunal" };

        await POST(req as Request, res as Response);

        expect(res.redirect).toHaveBeenCalledWith("/search");
        expect(res.redirect).toHaveBeenCalledTimes(1);
      });

      it("should redirect to /summary-of-publications?locationId=9 for sjp-case option", async () => {
        req.body = { viewOption: "sjp-case" };

        await POST(req as Request, res as Response);

        expect(res.redirect).toHaveBeenCalledWith("/summary-of-publications?locationId=9");
        expect(res.redirect).toHaveBeenCalledTimes(1);
      });
    });

    describe("validation errors", () => {
      it("should render error when no option selected", async () => {
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "view-option",
          expect.objectContaining({
            errors: [
              {
                text: "An option must be selected",
                href: "#viewOption"
              }
            ]
          })
        );
        expect(res.redirect).not.toHaveBeenCalled();
      });

      it("should render error when viewOption is undefined", async () => {
        req.body = { viewOption: undefined };

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "view-option",
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                text: "An option must be selected",
                href: "#viewOption"
              })
            ])
          })
        );
      });

      it("should render error when viewOption is null", async () => {
        req.body = { viewOption: null };

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "view-option",
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                text: "An option must be selected",
                href: "#viewOption"
              })
            ])
          })
        );
      });

      it("should render error when viewOption is empty string", async () => {
        req.body = { viewOption: "" };

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "view-option",
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                text: "An option must be selected",
                href: "#viewOption"
              })
            ])
          })
        );
      });

      it("should render error with invalid option", async () => {
        req.body = { viewOption: "invalid-option" };

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "view-option",
          expect.objectContaining({
            errors: [
              {
                text: "An option must be selected",
                href: "#viewOption"
              }
            ]
          })
        );
        expect(res.redirect).not.toHaveBeenCalled();
      });

      it("should include backLink when rendering errors", async () => {
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "view-option",
          expect.objectContaining({
            backLink: "/"
          })
        );
      });

      it("should include translations when rendering errors", async () => {
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "view-option",
          expect.objectContaining({
            en: expect.any(Object),
            cy: expect.any(Object)
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
          "view-option",
          expect.objectContaining({
            errors: [
              {
                text: "An option must be selected",
                href: "#viewOption"
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
          "view-option",
          expect.objectContaining({
            errors: [
              {
                text: "Rhaid dewis opsiwn",
                href: "#viewOption"
              }
            ]
          })
        );
      });

      it("should include href pointing to radio group", async () => {
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "view-option",
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                href: "#viewOption"
              })
            ])
          })
        );
      });

      it("should pass en and cy objects to render", async () => {
        req.body = {};

        await POST(req as Request, res as Response);

        expect(res.render).toHaveBeenCalledWith(
          "view-option",
          expect.objectContaining({
            en: expect.any(Object),
            cy: expect.any(Object)
          })
        );
      });
    });
  });
});
