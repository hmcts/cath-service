import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("account-request-submitted controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: {}
    };

    mockResponse = {
      render: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render the confirmation page with English content by default", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "account-request-submitted/index",
        expect.objectContaining({
          locale: "en",
          bannerTitle: expect.any(String),
          sectionTitle: expect.any(String),
          bodyText1: expect.any(String),
          bodyText2: expect.any(String),
          bodyText3: expect.any(String)
        })
      );
    });

    it("should render the confirmation page with Welsh content when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "account-request-submitted/index",
        expect.objectContaining({
          locale: "cy",
          bannerTitle: expect.any(String),
          sectionTitle: expect.any(String),
          bodyText1: expect.any(String),
          bodyText2: expect.any(String),
          bodyText3: expect.any(String)
        })
      );
    });

    it("should pass correct English content to template", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "account-request-submitted/index",
        expect.objectContaining({
          bannerTitle: "Details submitted",
          sectionTitle: "What happens next",
          bodyText1: "HMCTS will review your details.",
          bodyText2: "We'll email you if we need more information or to confirm that your account has been created.",
          bodyText3: "If you do not get an email from us within 5 working days, call our courts and tribunals service centre on 0300 303 0656."
        })
      );
    });

    it("should pass correct Welsh content to template", async () => {
      mockRequest.query = { lng: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "account-request-submitted/index",
        expect.objectContaining({
          bannerTitle: "Cyflwyno manylion",
          sectionTitle: "Beth sy'n digwydd nesaf",
          bodyText1: "Bydd GLlTEM yn adolygu eich manylion.",
          bodyText2: "Byddwn yn anfon e-bost atoch os bydd angen mwy o wybodaeth arnom neu i gadarnhau bod eich cyfrif wedi ei greu.",
          bodyText3: "Os na fyddwch yn cael e-bost gennym o fewn 5 diwrnod gwaith, ffoniwch ein canolfan gwasanaeth llysoedd a thribiwnlysoedd ar 0300 303 0656"
        })
      );
    });
  });
});
