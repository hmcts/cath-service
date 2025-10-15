import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("index page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {};
    res = {
      render: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render index template with landing page content", async () => {
      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith("index", {
        en: expect.objectContaining({
          heading: "Court and tribunal hearings",
          hearingsList: expect.arrayContaining([
            expect.stringContaining("civil and family courts"),
            expect.stringContaining("First Tier and Upper Tribunals"),
            expect.stringContaining("Royal Courts of Justice"),
            expect.stringContaining("Single Justice Procedure")
          ]),
          additionalInfo: "More courts and tribunals will become available over time.",
          continueButton: "Continue"
        }),
        cy: expect.objectContaining({
          heading: "Gwrandawiadau llys a thribiwnlys",
          hearingsList: expect.arrayContaining([
            expect.stringContaining("Lysoedd Sifil a Theulu"),
            expect.stringContaining("Tribiwnlys Haen Gyntaf"),
            expect.stringContaining("Llys Barn Brenhinol"),
            expect.stringContaining("Gweithdrefn Un Ynad")
          ]),
          additionalInfo: "Bydd mwy o lysoedd a thribiwnlysoedd ar gael gydag amser.",
          continueButton: "Parhau"
        })
      });
    });

    it("should provide exactly 4 hearings in the list", async () => {
      await GET(req as Request, res as Response);

      const callArgs = (res.render as any).mock.calls[0][1];
      expect(callArgs.en.hearingsList).toHaveLength(4);
      expect(callArgs.cy.hearingsList).toHaveLength(4);
    });

    it("should be an async function", () => {
      expect(GET).toBeInstanceOf(Function);
      expect(GET.constructor.name).toBe("AsyncFunction");
    });

    it("should call render exactly once", async () => {
      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledTimes(1);
    });

    it("should not modify request object", async () => {
      const originalReq = { ...req };

      await GET(req as Request, res as Response);

      expect(req).toEqual(originalReq);
    });
  });
});
