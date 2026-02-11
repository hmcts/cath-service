import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/list-types-common", () => ({
  mockListTypes: [
    {
      id: 1,
      name: "CIVIL_DAILY_CAUSE_LIST",
      englishFriendlyName: "Civil Daily Cause List",
      welshFriendlyName: "Rhestr Achosion Dyddiol Sifil",
      provenance: "CFT_IDAM",
      isNonStrategic: false
    },
    {
      id: 2,
      name: "FAMILY_DAILY_CAUSE_LIST",
      englishFriendlyName: "Family Daily Cause List",
      welshFriendlyName: "Rhestr Achosion Dyddiol Teulu",
      provenance: "CFT_IDAM",
      isNonStrategic: false
    },
    {
      id: 3,
      name: "CRIME_DAILY_LIST",
      englishFriendlyName: "Crime Daily List",
      welshFriendlyName: "Rhestr Ddyddiol Troseddol",
      provenance: "CRIME_IDAM",
      isNonStrategic: false
    }
  ],
  convertExcelToJson: vi.fn(),
  validateDateFormat: vi.fn(),
  validateNoHtmlTags: vi.fn(),
  convertExcelForListType: vi.fn(),
  createConverter: vi.fn(),
  getConverterForListType: vi.fn(),
  hasConverterForListType: vi.fn(),
  registerConverter: vi.fn(),
  convertListTypeNameToKebabCase: vi.fn(),
  validateListTypeJson: vi.fn()
}));

describe("subscription-list-types", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      session: {} as any,
      path: "/subscription-list-types"
    };
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render page with grouped list types", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-types/index",
        expect.objectContaining({
          pageTitle: "Select list types",
          groupedListTypes: expect.arrayContaining([
            expect.objectContaining({
              letter: "C",
              items: expect.arrayContaining([
                expect.objectContaining({ text: "Civil Daily Cause List", value: "1" }),
                expect.objectContaining({ text: "Crime Daily List", value: "3" })
              ])
            }),
            expect.objectContaining({
              letter: "F",
              items: expect.arrayContaining([expect.objectContaining({ text: "Family Daily Cause List", value: "2" })])
            })
          ])
        })
      );
    });

    it("should use Welsh content when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-types/index",
        expect.objectContaining({
          pageTitle: "Dewis Mathau o Restri"
        })
      );
    });

    it("should restore session data if present", async () => {
      mockReq.session = {
        listTypeSubscription: {
          selectedListTypeIds: [1, 2]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-types/index",
        expect.objectContaining({
          data: { selectedListTypeIds: [1, 2] }
        })
      );
    });
  });

  describe("POST", () => {
    it("should save selection and redirect when list types selected", async () => {
      mockReq.body = { listTypes: ["1", "2"] };
      mockReq.session = {} as any;
      const sessionSave = vi.fn((cb) => cb(null));
      mockReq.session.save = sessionSave;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.listTypeSubscription).toEqual({
        selectedListTypeIds: [1, 2]
      });
      expect(sessionSave).toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-list-language");
    });

    it("should handle single list type selection", async () => {
      mockReq.body = { listTypes: "1" };
      mockReq.session = {} as any;
      const sessionSave = vi.fn((cb) => cb(null));
      mockReq.session.save = sessionSave;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.listTypeSubscription).toEqual({
        selectedListTypeIds: [1]
      });
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-list-language");
    });

    it("should render with error when no list types selected", async () => {
      mockReq.body = {};

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-types/index",
        expect.objectContaining({
          errors: [
            {
              text: "Please select a list type to continue",
              href: "#list-types"
            }
          ],
          data: {}
        })
      );
    });

    it("should render with error in Welsh when no list types selected and locale is cy", async () => {
      mockReq.body = {};
      mockRes.locals = { locale: "cy" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-types/index",
        expect.objectContaining({
          errors: [
            {
              text: "Dewiswch opsiwn math o restr",
              href: "#list-types"
            }
          ]
        })
      );
    });

    it("should show error message on session save error", async () => {
      mockReq.body = { listTypes: ["1"] };
      mockReq.session = {} as any;
      const sessionSave = vi.fn((cb) => cb(new Error("Session error")));
      mockReq.session.save = sessionSave;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-types/index",
        expect.objectContaining({
          errors: [
            {
              text: "Sorry, there was a problem saving your selection. Please try again.",
              href: "#list-types"
            }
          ]
        })
      );
    });
  });
});
