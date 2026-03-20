import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

vi.mock("@hmcts/third-party-user", () => ({
  validateName: vi.fn()
}));

import { validateName } from "@hmcts/third-party-user";

describe("third-party-users create page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never };
    res = { render: vi.fn(), redirect: vi.fn() };
  });

  describe("getHandler", () => {
    it("should render the create page with empty name by default", async () => {
      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/create/index",
        expect.objectContaining({
          pageTitle: "Create third party user",
          data: { name: "" }
        })
      );
    });

    it("should pre-populate name from session", async () => {
      // Arrange
      req.session = { thirdPartyCreate: { name: "Existing Name" } } as never;

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith("third-party-users/create/index", expect.objectContaining({ data: { name: "Existing Name" } }));
    });

    it("should render in Welsh", async () => {
      // Arrange
      req.query = { lng: "cy" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith("third-party-users/create/index", expect.objectContaining({ pageTitle: "Creu defnyddiwr trydydd parti" }));
    });
  });

  describe("postHandler", () => {
    it("should redirect to summary on valid name", async () => {
      // Arrange
      req.body = { name: "Valid Name" };
      vi.mocked(validateName).mockReturnValue(null);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/create/summary");
      expect((req.session as never as Record<string, unknown>).thirdPartyCreate).toEqual({ name: "Valid Name" });
    });

    it("should re-render with errors on invalid name", async () => {
      // Arrange
      req.body = { name: "" };
      vi.mocked(validateName).mockReturnValue({ href: "#name", text: "Enter a name" });

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/create/index",
        expect.objectContaining({
          errors: [{ href: "#name", text: "Enter a name" }],
          data: { name: "" }
        })
      );
    });

    it("should redirect to Welsh summary on valid name with Welsh param", async () => {
      // Arrange
      req.query = { lng: "cy" };
      req.body = { name: "Valid Name" };
      vi.mocked(validateName).mockReturnValue(null);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/create/summary?lng=cy");
    });
  });
});
