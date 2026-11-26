import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET } from "./index.js";

describe("migration page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {} };
    res = { render: vi.fn(), locals: { locale: "en" } };
  });

  it("should require the system admin role before the handler", () => {
    // Assert
    expect(GET).toHaveLength(2);
  });

  it("should render the English content with the connection check tile", async () => {
    // Arrange
    const handler = GET[GET.length - 1];

    // Act
    await handler(req as Request, res as Response, vi.fn());

    // Assert
    expect(res.render).toHaveBeenCalledWith(
      "migration/index",
      expect.objectContaining({
        title: en.title,
        lngParam: "",
        tiles: [expect.objectContaining({ title: en.tiles[0].title, href: "/migration-connection-check" })]
      })
    );
  });

  it("should render Welsh content and keep the language on tile links", async () => {
    // Arrange
    res.locals = { locale: "cy" };
    const handler = GET[GET.length - 1];

    // Act
    await handler(req as Request, res as Response, vi.fn());

    // Assert
    expect(res.render).toHaveBeenCalledWith(
      "migration/index",
      expect.objectContaining({
        title: cy.title,
        lngParam: "?lng=cy",
        tiles: [expect.objectContaining({ href: "/migration-connection-check?lng=cy" })]
      })
    );
  });
});
