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

    it("should include FaCT section content", async () => {
      await GET(req as Request, res as Response);

      const callArgs = (res.render as any).mock.calls[0][1];

      expect(callArgs.en.factSectionTitle).toBe("Find a court or tribunal");
      expect(callArgs.en.factSectionText).toBe("Find contact details and other information about courts and tribunals");
      expect(callArgs.en.factSectionTextSuffix).toBe(" in England and Wales, and some non-devolved tribunals in Scotland.");
      expect(callArgs.en.factLinkUrl).toBe("https://www.gov.uk/find-court-tribunal");
      expect(callArgs.en.factLinkText).toBe("Find contact details and other information about courts and tribunals");

      expect(callArgs.cy.factSectionTitle).toBe("Dod o hyd i lys neu dribiwnlys");
      expect(callArgs.cy.factSectionText).toBe("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");
      expect(callArgs.cy.factSectionTextSuffix).toBe(" yng Nghymru a Lloegr, a rhai tribiwnlysoedd heb eu datganoli yn yr Alban.");
      expect(callArgs.cy.factLinkUrl).toBe("https://www.gov.uk/find-court-tribunal");
      expect(callArgs.cy.factLinkText).toBe("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");
    });

    it("should include Before you start section content", async () => {
      await GET(req as Request, res as Response);

      const callArgs = (res.render as any).mock.calls[0][1];

      expect(callArgs.en.beforeYouStartTitle).toBe("Before you start");
      expect(callArgs.en.scotlandNorthernIrelandTitle).toBe("If you're in Scotland or Northern Ireland");
      expect(callArgs.en.contactText).toBe("Contact the:");

      expect(callArgs.cy.beforeYouStartTitle).toBe("Cyn i chi ddechrau");
      expect(callArgs.cy.scotlandNorthernIrelandTitle).toBe("Os ydych yn byw yn Yr Alban neu Gogledd Iwerddon");
      expect(callArgs.cy.contactText).toBe("Cysylltwch â:");
    });

    it("should include Scottish Courts information", async () => {
      await GET(req as Request, res as Response);

      const callArgs = (res.render as any).mock.calls[0][1];

      expect(callArgs.en.scottishCourtsLink).toBe("Scottish Courts website");
      expect(callArgs.en.scottishCourtsUrl).toBe("https://www.scotcourts.gov.uk");
      expect(callArgs.en.scottishCourtsText).toBe(" for courts and some tribunals in Scotland");

      expect(callArgs.cy.scottishCourtsLink).toBe("Gwefan Llysoedd yr Alban");
      expect(callArgs.cy.scottishCourtsUrl).toBe("https://www.scotcourts.gov.uk");
      expect(callArgs.cy.scottishCourtsText).toBe(" ar gyfer rhai Llysoedd a Thribiwnlysoedd yn Yr Alban");
    });

    it("should include Northern Ireland Courts information", async () => {
      await GET(req as Request, res as Response);

      const callArgs = (res.render as any).mock.calls[0][1];

      expect(callArgs.en.niCourtsLink).toBe("Northern Ireland Courts and Tribunals Service");
      expect(callArgs.en.niCourtsUrl).toBe("https://www.justice-ni.gov.uk/topics/courts-and-tribunals");
      expect(callArgs.en.niCourtsText).toBe(" for courts and tribunals in Northern Ireland");

      expect(callArgs.cy.niCourtsLink).toBe("Gwasanaeth Llysoedd a Thribiwnlysoedd Gogledd Iwerddon");
      expect(callArgs.cy.niCourtsUrl).toBe("https://www.justice-ni.gov.uk/topics/courts-and-tribunals");
      expect(callArgs.cy.niCourtsText).toBe(" ar gyfer llysoedd a thribiwnlysoedd yng Ngogledd Iwerddon");
    });

    it("should use same URLs in both English and Welsh locales", async () => {
      await GET(req as Request, res as Response);

      const callArgs = (res.render as any).mock.calls[0][1];

      expect(callArgs.en.factLinkUrl).toBe(callArgs.cy.factLinkUrl);
      expect(callArgs.en.scottishCourtsUrl).toBe(callArgs.cy.scottishCourtsUrl);
      expect(callArgs.en.niCourtsUrl).toBe(callArgs.cy.niCourtsUrl);
    });
  });
});
