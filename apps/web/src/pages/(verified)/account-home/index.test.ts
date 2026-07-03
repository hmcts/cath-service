import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

describe("account-home", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required page title", () => {
      expect(en.pageTitle).toBe("Dashboard - Your account");
    });

    it("should have required title", () => {
      expect(en.title).toBe("Your account");
    });

    it("should have court hearings section", () => {
      expect(en.sections.courtHearings).toBeDefined();
      expect(en.sections.courtHearings.title).toBe("Court and tribunal hearings");
      expect(en.sections.courtHearings.description).toBe("View time, location, type of hearings and more.");
    });

    it("should have SJP cases section", () => {
      expect(en.sections.sjpCases).toBeDefined();
      expect(en.sections.sjpCases.title).toBe("Single Justice Procedure cases");
      expect(en.sections.sjpCases.description).toBe(
        "Cases ready to be decided by a magistrate without a hearing. Includes TV licensing, minor traffic offences such as speeding and more."
      );
    });

    it("should have email subscriptions section", () => {
      expect(en.sections.emailSubscriptions).toBeDefined();
      expect(en.sections.emailSubscriptions.title).toBe("Email subscriptions");
      expect(en.sections.emailSubscriptions.description).toBe("Get emails about hearings from different courts and tribunals and manage your subscriptions.");
    });
  });

  describe("Welsh locale", () => {
    it("should have required page title", () => {
      expect(cy.pageTitle).toBe("Dangosfwrdd - Eich cyfrif");
    });

    it("should have required title", () => {
      expect(cy.title).toBe("Eich cyfrif");
    });

    it("should have court hearings section", () => {
      expect(cy.sections.courtHearings).toBeDefined();
      expect(cy.sections.courtHearings.title).toBe("Gwrandawiadau llys a thribiwnlys");
      expect(cy.sections.courtHearings.description).toBe("Gweld amser, lleoliad, math o wrandawiadau a mwy.");
    });

    it("should have SJP cases section", () => {
      expect(cy.sections.sjpCases).toBeDefined();
      expect(cy.sections.sjpCases.title).toBe("Achosion Gweithdrefn Ynad Unigol");
      expect(cy.sections.sjpCases.description).toBe(
        "Achosion sy'n barod i gael eu penderfynu gan ynad heb wrandawiad. Yn cynnwys trwyddedu teledu, mân dramgwyddau traffig fel goryrru a mwy."
      );
    });

    it("should have email subscriptions section", () => {
      expect(cy.sections.emailSubscriptions).toBeDefined();
      expect(cy.sections.emailSubscriptions.title).toBe("Tanysgrifiadau e-bost");
      expect(cy.sections.emailSubscriptions.description).toBe("Cael e-byst am wrandawiadau o wahanol lysoedd a thribiwnlysoedd a rheoli eich tanysgrifiadau.");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have same section keys", () => {
      expect(Object.keys(en.sections).sort()).toEqual(Object.keys(cy.sections).sort());
    });

    it("should have same properties for each section", () => {
      for (const sectionKey of Object.keys(en.sections)) {
        const enSection = en.sections[sectionKey as keyof typeof en.sections];
        const cySection = cy.sections[sectionKey as keyof typeof cy.sections];
        expect(Object.keys(enSection).sort()).toEqual(Object.keys(cySection).sort());
      }
    });

    it("should have all required section properties", () => {
      const requiredProps = ["title", "description"];

      for (const section of Object.values(en.sections)) {
        requiredProps.forEach((prop) => {
          expect(section).toHaveProperty(prop);
        });
      }

      for (const section of Object.values(cy.sections)) {
        requiredProps.forEach((prop) => {
          expect(section).toHaveProperty(prop);
        });
      }
    });
  });

  describe("Content validation", () => {
    it("should have non-empty strings for all English content", () => {
      expect(en.pageTitle.length).toBeGreaterThan(0);
      expect(en.title.length).toBeGreaterThan(0);

      for (const section of Object.values(en.sections)) {
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.description.length).toBeGreaterThan(0);
      }
    });

    it("should have non-empty strings for all Welsh content", () => {
      expect(cy.pageTitle.length).toBeGreaterThan(0);
      expect(cy.title.length).toBeGreaterThan(0);

      for (const section of Object.values(cy.sections)) {
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe("GET controller", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockRequest = { path: "/account-home" };
      mockResponse = {
        render: vi.fn(),
        locals: { locale: "en" }
      };
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should render account-home with en and cy content", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith("account-home/index", expect.objectContaining({ en: expect.any(Object), cy: expect.any(Object) }));
    });

    it("should build navigation for the current path", async () => {
      const { buildVerifiedUserNavigation } = await import("@hmcts/auth");
      const { GET } = await import("./index.js");
      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(mockRequest as Request, mockResponse as Response);

      expect(buildVerifiedUserNavigation).toHaveBeenCalledWith("/account-home", "en");
    });

    it("should use Welsh locale when set", async () => {
      mockResponse.locals = { locale: "cy" };
      const { buildVerifiedUserNavigation } = await import("@hmcts/auth");
      const { GET } = await import("./index.js");
      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(mockRequest as Request, mockResponse as Response);

      expect(buildVerifiedUserNavigation).toHaveBeenCalledWith("/account-home", "cy");
    });

    it("should default to English locale when not set", async () => {
      mockResponse.locals = {};
      const { buildVerifiedUserNavigation } = await import("@hmcts/auth");
      const { GET } = await import("./index.js");
      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(mockRequest as Request, mockResponse as Response);

      expect(buildVerifiedUserNavigation).toHaveBeenCalledWith("/account-home", "en");
    });
  });
});
