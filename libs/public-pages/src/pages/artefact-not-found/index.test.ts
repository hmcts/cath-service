import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET } from "./index.js";

describe("artefact-not-found GET", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      render: vi.fn()
    };
  });

  it("should render with English translations when locale is 'en'", async () => {
    mockResponse.locals = { locale: "en" };

    await GET(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.render).toHaveBeenCalledWith("artefact-not-found/index", en);
  });

  it("should render with Welsh translations when locale is 'cy'", async () => {
    mockResponse.locals = { locale: "cy" };

    await GET(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.render).toHaveBeenCalledWith("artefact-not-found/index", cy);
  });

  it("should default to English translations when locale is not set", async () => {
    mockResponse.locals = {};

    await GET(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.render).toHaveBeenCalledWith("artefact-not-found/index", en);
  });

  it("should always return 404 status", async () => {
    mockResponse.locals = { locale: "en" };

    await GET(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });
});
