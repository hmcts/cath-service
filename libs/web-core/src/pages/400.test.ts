import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "../views/errors/cy.js";
import { en } from "../views/errors/en.js";
import { GET } from "./400.js";

describe("400 Error Page - GET handler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let renderSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    renderSpy = vi.fn();
    statusSpy = vi.fn().mockReturnThis();
    mockRequest = {};
    mockResponse = {
      status: statusSpy,
      render: renderSpy,
      locals: {
        locale: "en"
      }
    };
  });

  it("should render 400 error page with correct status", async () => {
    await GET(mockRequest as Request, mockResponse as Response);

    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(renderSpy).toHaveBeenCalledWith("errors/400", {
      en: en.error400,
      cy: cy.error400,
      t: en.error400
    });
  });
});
