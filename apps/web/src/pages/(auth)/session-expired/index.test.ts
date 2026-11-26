import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET } from "./index.js";

describe("session-expired page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = { query: { reSignInUrl: "CFT" } };
    res = { render: vi.fn(), status: vi.fn().mockReturnThis(), locals: { locale: "en" } };
  });

  it.each([
    ["CFT", "/cft-login"],
    ["CRIME", "/crime-login"],
    ["AAD", "/b2c-login"],
    ["SSO", "/login"]
  ])("should link Sign in for reSignInUrl=%s to %s", async (reSignInUrl, signInUrl) => {
    // Arrange
    req.query = { reSignInUrl };

    // Act
    await GET(req as Request, res as Response);

    // Assert
    expect(res.render).toHaveBeenCalledWith("session-expired/index", { en, cy, t: en, signInUrl });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should use Welsh from res.locals.locale without an lng query", async () => {
    // Arrange
    res.locals = { locale: "cy" };

    // Act
    await GET(req as Request, res as Response);

    // Assert
    expect(res.render).toHaveBeenCalledWith("session-expired/index", expect.objectContaining({ t: cy }));
  });

  it("should not pass a back link", async () => {
    // Act
    await GET(req as Request, res as Response);

    // Assert
    expect(vi.mocked(res.render as (view: string, options: object) => void).mock.calls[0][1]).not.toHaveProperty("back");
  });

  it.each([
    ["missing", {}],
    ["unknown", { reSignInUrl: "EVIL" }],
    ["lower case", { reSignInUrl: "cft" }],
    ["a URL", { reSignInUrl: "https://evil.example" }],
    ["an array", { reSignInUrl: ["CFT", "SSO"] }],
    ["a prototype key", { reSignInUrl: "toString" }]
  ])("should render the 400 error page when reSignInUrl is %s", async (_description, query) => {
    // Arrange
    req.query = query as Request["query"];

    // Act
    await GET(req as Request, res as Response);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ t: expect.objectContaining({ defaultHeading: "Error" }) }));
    expect(res.render).not.toHaveBeenCalledWith("session-expired/index", expect.anything());
  });

  it("should render the Welsh 400 error page when the locale is cy", async () => {
    // Arrange
    req.query = {};
    res.locals = { locale: "cy" };

    // Act
    await GET(req as Request, res as Response);

    // Assert
    expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ t: expect.objectContaining({ defaultHeading: "Gwall" }) }));
  });

  it("should carry the legacy English copy verbatim", () => {
    expect(en).toEqual({
      pageTitle: "Session expired - You have been signed out due to inactivity",
      header: "You have been signed out due to inactivity",
      detail: "This has been for your security and for the security of the individuals included within our service.",
      signInMessage: "Please click here to sign in or close this session.",
      signIn: "Sign in"
    });
  });

  it("should carry the legacy Welsh copy verbatim", () => {
    expect(cy.header).toBe("Rydych wedi cael eich allgofnodi o ganlyniad i wneud dim");
    expect(cy.signIn).toBe("Mewngofnodi");
  });
});
