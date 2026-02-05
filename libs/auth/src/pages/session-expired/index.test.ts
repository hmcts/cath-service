import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET } from "./index.js";

describe("Session Expired Page", () => {
  it("should render session expired page with English content by default", async () => {
    const req = {
      query: {}
    } as Request;

    const res = {
      render: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(res.render).toHaveBeenCalledWith("session-expired/index", {
      pageTitle: en.pageTitle,
      heading: en.heading,
      bodyText: en.bodyText,
      signInAgainLink: en.signInAgainLink
    });
  });

  it("should render session expired page with Welsh content when lng=cy", async () => {
    const req = {
      query: { lng: "cy" }
    } as unknown as Request;

    const res = {
      render: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(res.render).toHaveBeenCalledWith("session-expired/index", {
      pageTitle: cy.pageTitle,
      heading: cy.heading,
      bodyText: cy.bodyText,
      signInAgainLink: cy.signInAgainLink
    });
  });

  it("should use English content for any non-Welsh language query", async () => {
    const req = {
      query: { lng: "fr" }
    } as unknown as Request;

    const res = {
      render: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(res.render).toHaveBeenCalledWith("session-expired/index", {
      pageTitle: en.pageTitle,
      heading: en.heading,
      bodyText: en.bodyText,
      signInAgainLink: en.signInAgainLink
    });
  });

  it("should contain correct English content", () => {
    expect(en.pageTitle).toBe("You have been signed out");
    expect(en.heading).toBe("You have been signed out, due to inactivity");
    expect(en.bodyText).toBe("Your session has expired because you have been inactive for too long.");
    expect(en.signInAgainLink).toBe("Sign in again");
  });

  it("should contain correct Welsh content", () => {
    expect(cy.pageTitle).toBe("Rydych wedi cael eich allgofnodi");
    expect(cy.heading).toBe("Rydych wedi cael eich allgofnodi oherwydd anweithgarwch");
    expect(cy.bodyText).toBe("Mae eich sesiwn wedi dod i ben oherwydd eich bod wedi bod yn anweithgar am ormod o amser.");
    expect(cy.signInAgainLink).toBe("Mewngofnodi eto");
  });
});
