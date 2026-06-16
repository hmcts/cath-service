import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("SSO Rejected page handler", () => {
  it("should render rejected page with English and Welsh content", async () => {
    const req = {} as Request;

    const res = {
      render: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(res.render).toHaveBeenCalledWith("sso-rejected/index", {
      en: expect.objectContaining({
        title: expect.stringContaining("SSO Rejected Login"),
        header: "SSO Rejected Login",
        paragraph1: expect.any(String),
        linkText: "ServiceNow"
      }),
      cy: expect.objectContaining({
        title: expect.stringContaining("Mewngofnodiad SSO wedi'i Wrthod"),
        header: "Mewngofnodiad SSO wedi'i Wrthod",
        paragraph1: expect.any(String),
        linkText: "ServiceNow"
      })
    });
  });

  it("should include correct English content", async () => {
    const req = {} as Request;

    const res = {
      render: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    const renderCall = vi.mocked(res.render).mock.calls[0];
    const content = renderCall?.[1] as any;

    expect(content.en.title).toContain("GOV.UK");
    expect(content.en.paragraph1).toContain("Unfortunately");
    expect(content.en.paragraph1).toContain("admin dashboard");
  });

  it("should include correct Welsh content", async () => {
    const req = {} as Request;

    const res = {
      render: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    const renderCall = vi.mocked(res.render).mock.calls[0];
    const content = renderCall?.[1] as any;

    expect(content.cy.title).toContain("GOV.UK");
    expect(content.cy.paragraph1).toContain("Yn anffodus");
    expect(content.cy.paragraph1).toContain("dangosfwrdd gweinyddol");
  });
});
