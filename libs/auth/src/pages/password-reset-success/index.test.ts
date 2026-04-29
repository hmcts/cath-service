import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("Password Reset Success Page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {};
    res = {
      render: vi.fn()
    };
  });

  it("should render the password reset success page", async () => {
    await GET(req as Request, res as Response);

    expect(res.render).toHaveBeenCalledWith("password-reset-success/index", {
      en: expect.objectContaining({ title: "Your password has been reset" }),
      cy: expect.objectContaining({ title: "Mae eich cyfrinair wedi'i ailosod" })
    });
  });

  it("should include sign in link text in both languages", async () => {
    await GET(req as Request, res as Response);

    const renderCall = (res.render as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(renderCall[1].en.signInLink).toBe("Sign in with your new password");
    expect(renderCall[1].cy.signInLink).toBe("Mewngofnodwch gyda'ch cyfrinair newydd");
  });
});
