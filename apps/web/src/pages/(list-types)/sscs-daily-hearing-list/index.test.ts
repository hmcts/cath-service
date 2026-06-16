import { readFile } from "node:fs/promises";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn()
}));

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    createJsonValidator: () => mockValidate,
    provenanceLabelsEn: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform" },
    provenanceLabelsCy: { MANUAL_UPLOAD: "Lanlwytho â Llaw", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform" }
  };
});

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn()
}));

vi.mock("@hmcts/location", () => ({
  listTypeData: [
    {
      id: 34,
      name: "SSCS_LONDON_DAILY_HEARING_LIST",
      englishFriendlyName: "London Social Security and Child Support Tribunal Daily Hearing List",
      welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Llundain",
      provenance: "MANUAL_UPLOAD",
      urlPath: "sscs-daily-hearing-list",
      isNonStrategic: true,
      defaultSensitivity: "Public",
      shortenedFriendlyName: "SSCS London Daily Hearing List",
      subJurisdictionIds: [8]
    }
  ]
}));

vi.mock("@hmcts/sscs-daily-hearing-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/sscs-daily-hearing-list")>();
  return {
    ...actual,
    renderSscsDailyHearingListData: vi.fn()
  };
});

import { getArtefactById } from "@hmcts/publication";
import { renderSscsDailyHearingListData } from "@hmcts/sscs-daily-hearing-list";
import { GET } from "./index.js";

describe("SSCS Daily Hearing List page controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {}
    };

    res = {
      status: vi.fn().mockReturnThis(),
      render: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET handler", () => {
    it("should render the list successfully with valid data", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "19",
        listTypeId: 34,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01"),
        displayTo: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          venue: "London Tribunal Centre",
          appealReferenceNumber: "SC/001/2026",
          hearingType: "Oral Hearing",
          appellant: "Smith, John",
          courtroom: "Room 1",
          hearingTime: "10:00am",
          tribunal: "SSCS",
          respondent: "Secretary of State for Work and Pensions",
          additionalInformation: ""
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "London Social Security and Child Support Tribunal Daily Hearing List",
          listDate: "1 January 2026",
          lastUpdatedDate: "1 January 2026",
          lastUpdatedTime: "12:00pm"
        },
        hearings: mockJsonData
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderSscsDailyHearingListData).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(getArtefactById).toHaveBeenCalledWith("test-artefact-123");
      expect(readFile).toHaveBeenCalled();
      expect(mockValidate).toHaveBeenCalledWith(mockJsonData);
      expect(renderSscsDailyHearingListData).toHaveBeenCalledWith(
        mockJsonData,
        expect.objectContaining({
          locale: "en",
          listTitle: "London Social Security and Child Support Tribunal Daily Hearing List"
        })
      );

      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[0]).toBe("sscs-daily-hearing-list");
      expect(renderCall[1]).toMatchObject({
        header: mockRenderedData.header,
        hearings: mockRenderedData.hearings,
        dataSource: "Manual Upload"
      });
    });

    it("should return 400 when artefactId is missing", async () => {
      req.query = {};

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Bad Request",
          errorMessage: "Missing artefactId parameter"
        })
      );
    });

    it("should return 404 when artefact is not found", async () => {
      req.query = { artefactId: "non-existent-artefact" };

      vi.mocked(getArtefactById).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Not Found",
          errorMessage: "The requested list could not be found"
        })
      );
    });

    it("should return 404 when JSON file is not found", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "19",
        listTypeId: 34,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01"),
        displayTo: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Not Found",
          errorMessage: "The requested list could not be found"
        })
      );
    });

    it("should return 400 when JSON validation fails", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "19",
        listTypeId: 34,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01"),
        displayTo: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [{ venue: "<script>alert('xss')</script>" }];

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({
        isValid: false,
        errors: ["Invalid data: HTML tags not allowed"]
      });

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Invalid Data",
          errorMessage: "The list data is invalid"
        })
      );
    });

    it("should return 500 on server error", async () => {
      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database connection failed"));

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith(
        "errors/common",
        expect.objectContaining({
          errorTitle: "Server Error",
          errorMessage: "An error occurred while loading the list"
        })
      );
    });

    it("should use Welsh locale and friendly name when specified", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "19",
        listTypeId: 34,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01"),
        displayTo: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          venue: "London Tribunal Centre",
          appealReferenceNumber: "SC/001/2026",
          hearingType: "Oral Hearing",
          appellant: "Smith, John",
          courtroom: "Room 1",
          hearingTime: "10:00am",
          tribunal: "SSCS",
          respondent: "Secretary of State",
          additionalInformation: ""
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Llundain",
          listDate: "1 Ionawr 2026",
          lastUpdatedDate: "1 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        },
        hearings: mockJsonData
      };

      req.query = { artefactId: "test-artefact-123" };
      res.locals = { locale: "cy" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderSscsDailyHearingListData).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      expect(renderSscsDailyHearingListData).toHaveBeenCalledWith(
        mockJsonData,
        expect.objectContaining({
          locale: "cy",
          listTitle: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Llundain"
        })
      );
    });

    it("should include the important information text for the list type in the render", async () => {
      const mockArtefact = {
        artefactId: "test-artefact-123",
        locationId: "19",
        listTypeId: 34,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01"),
        displayTo: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };

      const mockJsonData = [
        {
          venue: "London Tribunal Centre",
          appealReferenceNumber: "SC/001/2026",
          hearingType: "Oral Hearing",
          appellant: "Smith, John",
          courtroom: "Room 1",
          hearingTime: "10:00am",
          tribunal: "SSCS",
          respondent: "Secretary of State",
          additionalInformation: ""
        }
      ];

      const mockRenderedData = {
        header: {
          listTitle: "London Social Security and Child Support Tribunal Daily Hearing List",
          listDate: "1 January 2026",
          lastUpdatedDate: "1 January 2026",
          lastUpdatedTime: "12:00pm"
        },
        hearings: mockJsonData
      };

      req.query = { artefactId: "test-artefact-123" };

      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderSscsDailyHearingListData).mockReturnValue(mockRenderedData);

      await GET(req as Request, res as Response);

      const renderCall = vi.mocked(res.render!).mock.calls[0]!;
      expect(renderCall[1]).toHaveProperty("importantInformationText");
      expect((renderCall[1] as any).importantInformationText).toContain("sscsa-sutton@justice.gov.uk");
    });
  });
});
