import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("CFT Rejected Page", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      render: vi.fn()
    };
  });

  it("should render cft-rejected page with translations", async () => {
    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.render).toHaveBeenCalledWith(
      "cft-rejected/index",
      expect.objectContaining({
        en: expect.any(Object),
        cy: expect.any(Object)
      })
    );
  });

  it("should include correct English translations", async () => {
    await GET(mockReq as Request, mockRes as Response);

    const renderCall = (mockRes.render as any).mock.calls[0];
    const translations = renderCall[1];

    expect(translations.en.title).toBe("You cannot access this service");
    expect(translations.en.message).toContain("account type is not authorized");
  });

  it("should include correct Welsh translations", async () => {
    await GET(mockReq as Request, mockRes as Response);

    const renderCall = (mockRes.render as any).mock.calls[0];
    const translations = renderCall[1];

    expect(translations.cy.title).toBe("Ni allwch gael mynediad at y gwasanaeth hwn");
    expect(translations.cy.message).toContain("math o gyfrif");
  });
});
