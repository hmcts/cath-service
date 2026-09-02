import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/list-types-common", () => ({
  createJsonValidator: () => mockValidate,
  provenanceLabelsEn: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform", CP_CATH: "Libra", PDDA: "PDDA" },
  provenanceLabelsCy: { MANUAL_UPLOAD: "Lanlwytho â Llaw", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform", CP_CATH: "Libra", PDDA: "PDDA" }
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn().mockResolvedValue({ id: 1, allowedProvenance: "MANUAL_UPLOAD", isNonStrategic: true })
    }
  }
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  getPublicationJson: vi.fn(),
  canAccessPublicationData: vi.fn().mockReturnValue(true),
  resolveListType: vi.fn().mockResolvedValue({ id: 1, provenance: "CFT_IDAM", isNonStrategic: false }),
  PROVENANCE_LABELS: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist" }
}));

const { RPT_REGIONAL_EMAIL, MARKET_RENTS_EXTRA_INFORMATION_EN, MARKET_RENTS_EXTRA_INFORMATION_CY } = vi.hoisted(() => ({
  RPT_REGIONAL_EMAIL: {
    FTT_RPT_EASTERN_WEEKLY_HEARING_LIST: "RPEastern@justice.gov.uk",
    FTT_RPT_LONDON_WEEKLY_HEARING_LIST: "London.Rap@justice.gov.uk",
    FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST: "rpmidland@justice.gov.uk",
    FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST: "rpnorthern@justice.gov.uk",
    FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST: "RPSouthern@justice.gov.uk",
    FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST: "marketrents@justice.gov.uk"
  },
  MARKET_RENTS_EXTRA_INFORMATION_EN: "Market Rents extra information (en)",
  MARKET_RENTS_EXTRA_INFORMATION_CY: "Market Rents extra information (cy)"
}));

vi.mock("@hmcts/ftt-rpt-weekly-hearing-list", () => {
  return {
    buildImportantInformationText: (template: string, email: string) => template.replace("{email}", email),
    fttRptWeeklyHearingListEn: {
      provenanceLabels: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist" },
      rptEasternCourtName: "First-tier Tribunal (Residential Property Tribunal): Eastern region",
      rptLondonCourtName: "First-tier Tribunal (Residential Property Tribunal): London region",
      rptMidlandsCourtName: "First-tier Tribunal (Residential Property Tribunal): Midlands region",
      rptNorthernCourtName: "First-tier Tribunal (Residential Property Tribunal): Northern region",
      rptSouthernCourtName: "First-tier Tribunal (Residential Property Tribunal): Southern region",
      rptMarketRentsCourtName: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List",
      rptEasternPageTitle: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List",
      rptLondonPageTitle: "First-tier Tribunal (Residential Property Tribunal): London region Weekly Hearing List",
      rptMidlandsPageTitle: "First-tier Tribunal (Residential Property Tribunal): Midlands region Weekly Hearing List",
      rptNorthernPageTitle: "First-tier Tribunal (Residential Property Tribunal): Northern region Weekly Hearing List",
      rptSouthernPageTitle: "First-tier Tribunal (Residential Property Tribunal): Southern region Weekly Hearing List",
      rptMarketRentsPageTitle: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List",
      importantInformationTextTemplate: "Contact the tribunal at {email} for more information.",
      rptRegionalEmail: RPT_REGIONAL_EMAIL,
      marketRentsExtraInformation: MARKET_RENTS_EXTRA_INFORMATION_EN
    },
    fttRptWeeklyHearingListCy: {
      provenanceLabels: { MANUAL_UPLOAD: "Lanlwytho â Llaw", SNL: "ListAssist" },
      rptEasternCourtName: "First-tier Tribunal (Residential Property Tribunal): Eastern region",
      rptLondonCourtName: "First-tier Tribunal (Residential Property Tribunal): London region",
      rptMidlandsCourtName: "First-tier Tribunal (Residential Property Tribunal): Midlands region",
      rptNorthernCourtName: "First-tier Tribunal (Residential Property Tribunal): Northern region",
      rptSouthernCourtName: "First-tier Tribunal (Residential Property Tribunal): Southern region",
      rptMarketRentsCourtName: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List",
      rptEasternPageTitle: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List",
      rptLondonPageTitle: "First-tier Tribunal (Residential Property Tribunal): London region Weekly Hearing List",
      rptMidlandsPageTitle: "First-tier Tribunal (Residential Property Tribunal): Midlands region Weekly Hearing List",
      rptNorthernPageTitle: "First-tier Tribunal (Residential Property Tribunal): Northern region Weekly Hearing List",
      rptSouthernPageTitle: "First-tier Tribunal (Residential Property Tribunal): Southern region Weekly Hearing List",
      rptMarketRentsPageTitle: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List",
      importantInformationTextTemplate: "Cysylltwch â'r tribiwnlys yn {email} am fwy o wybodaeth.",
      rptRegionalEmail: RPT_REGIONAL_EMAIL,
      marketRentsExtraInformation: MARKET_RENTS_EXTRA_INFORMATION_CY
    },
    renderFttRptData: vi.fn()
  };
});

import { renderFttRptData } from "@hmcts/ftt-rpt-weekly-hearing-list";
import { getArtefactById, getPublicationJson } from "@hmcts/publication";
import { GET } from "./index.js";

const REGION_CASES = [
  {
    listTypeId: 33,
    listTypeName: "FTT_RPT_EASTERN_WEEKLY_HEARING_LIST",
    courtName: "First-tier Tribunal (Residential Property Tribunal): Eastern region",
    listTitle: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List",
    regionalEmail: "RPEastern@justice.gov.uk"
  },
  {
    listTypeId: 34,
    listTypeName: "FTT_RPT_LONDON_WEEKLY_HEARING_LIST",
    courtName: "First-tier Tribunal (Residential Property Tribunal): London region",
    listTitle: "First-tier Tribunal (Residential Property Tribunal): London region Weekly Hearing List",
    regionalEmail: "London.Rap@justice.gov.uk"
  },
  {
    listTypeId: 35,
    listTypeName: "FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST",
    courtName: "First-tier Tribunal (Residential Property Tribunal): Midlands region",
    listTitle: "First-tier Tribunal (Residential Property Tribunal): Midlands region Weekly Hearing List",
    regionalEmail: "rpmidland@justice.gov.uk"
  },
  {
    listTypeId: 36,
    listTypeName: "FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST",
    courtName: "First-tier Tribunal (Residential Property Tribunal): Northern region",
    listTitle: "First-tier Tribunal (Residential Property Tribunal): Northern region Weekly Hearing List",
    regionalEmail: "rpnorthern@justice.gov.uk"
  },
  {
    listTypeId: 37,
    listTypeName: "FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST",
    courtName: "First-tier Tribunal (Residential Property Tribunal): Southern region",
    listTitle: "First-tier Tribunal (Residential Property Tribunal): Southern region Weekly Hearing List",
    regionalEmail: "RPSouthern@justice.gov.uk"
  },
  {
    listTypeId: 38,
    listTypeName: "FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST",
    courtName: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List",
    listTitle: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List",
    regionalEmail: "marketrents@justice.gov.uk"
  }
];

const MOCK_JSON_DATA = [
  {
    date: "01/01/2026",
    time: "10:00am",
    venue: "Cambridge",
    caseType: "Residential",
    caseReferenceNumber: "RPT/00001/2026",
    judges: "Judge Smith",
    members: "Member A",
    hearingMethod: "In person",
    additionalInformation: ""
  }
];

describe("FTT RPT Weekly Hearing List page controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {} };
    res = { status: vi.fn().mockReturnThis(), render: vi.fn(), locals: { locale: "en" } };
  });

  describe("GET handler", () => {
    it("should return 400 when artefactId is missing", async () => {
      req.query = {};
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: "Bad Request" }));
    });

    it("should return 404 when artefact is not found", async () => {
      req.query = { artefactId: "non-existent" };
      vi.mocked(getArtefactById).mockResolvedValue(null);
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 400 for an unknown listTypeName", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId: "test-id",
        listTypeId: 99,
        listTypeName: "UNKNOWN_LIST_TYPE",
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      } as any);
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: "Invalid List Type" }));
    });

    it("should return 404 when blob is not found", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId: "test-id",
        listTypeId: 33,
        listTypeName: "FTT_RPT_EASTERN_WEEKLY_HEARING_LIST",
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      } as any);
      vi.mocked(getPublicationJson).mockResolvedValue(null);
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 400 when JSON validation fails", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId: "test-id",
        listTypeId: 33,
        listTypeName: "FTT_RPT_EASTERN_WEEKLY_HEARING_LIST",
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      } as any);
      vi.mocked(getPublicationJson).mockResolvedValue(MOCK_JSON_DATA);
      mockValidate.mockReturnValue({ isValid: false, errors: ["Invalid data"] });
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on unexpected server error", async () => {
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockRejectedValue(new Error("Database error"));
      await GET(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ errorTitle: "Server Error" }));
    });

    it("should render in Welsh when locale is cy", async () => {
      // Arrange
      res.locals = { locale: "cy" };
      const mockArtefact = {
        artefactId: "test-id",
        listTypeId: 33,
        listTypeName: "FTT_RPT_EASTERN_WEEKLY_HEARING_LIST",
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(MOCK_JSON_DATA);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderFttRptData).mockReturnValue({
        header: { listTitle: "title", weekCommencingDate: "", lastUpdatedDate: "", lastUpdatedTime: "" },
        hearings: []
      });

      // Act
      req.query = { artefactId: "test-id" };
      await GET(req as Request, res as Response);

      // Assert
      expect(renderFttRptData).toHaveBeenCalledWith(MOCK_JSON_DATA, expect.objectContaining({ locale: "cy" }));
      expect(res.render).toHaveBeenCalledWith("ftt-rpt-weekly-hearing-list", expect.objectContaining({ dataSource: "Lanlwytho â Llaw" }));
    });

    for (const { listTypeId, listTypeName, courtName, listTitle, regionalEmail } of REGION_CASES) {
      const isMarketRents = listTypeName === "FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST";

      it(`should render correctly for ${listTypeName} (${courtName.split(": ")[1]})`, async () => {
        // Arrange
        const mockArtefact = {
          artefactId: `test-artefact-${listTypeId}`,
          listTypeId,
          listTypeName,
          contentDate: new Date("2026-01-01"),
          lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
          provenance: "MANUAL_UPLOAD"
        };
        const mockRenderedData = {
          header: { listTitle, weekCommencingDate: "1 January 2026", lastUpdatedDate: "1 January 2026", lastUpdatedTime: "12pm" },
          hearings: []
        };

        req.query = { artefactId: `test-artefact-${listTypeId}` };
        vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
        vi.mocked(getPublicationJson).mockResolvedValue(MOCK_JSON_DATA);
        mockValidate.mockReturnValue({ isValid: true, errors: [] });
        vi.mocked(renderFttRptData).mockReturnValue(mockRenderedData);

        // Act
        await GET(req as Request, res as Response);

        // Assert
        expect(getPublicationJson).toHaveBeenCalledWith(`test-artefact-${listTypeId}`);
        expect(renderFttRptData).toHaveBeenCalledWith(MOCK_JSON_DATA, expect.objectContaining({ courtName }));
        expect(res.render).toHaveBeenCalledWith(
          "ftt-rpt-weekly-hearing-list",
          expect.objectContaining({
            dataSource: "Manual Upload",
            importantInformationText: expect.stringContaining(regionalEmail),
            extraInformationText: isMarketRents ? MARKET_RENTS_EXTRA_INFORMATION_EN : ""
          })
        );
      });
    }

    it("should resolve the Welsh regional email and extra information text for Market Rents", async () => {
      // Arrange
      res.locals = { locale: "cy" };
      const mockArtefact = {
        artefactId: "test-market-rents-cy",
        listTypeId: 38,
        listTypeName: "FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST",
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      };
      req.query = { artefactId: "test-market-rents-cy" };
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(getPublicationJson).mockResolvedValue(MOCK_JSON_DATA);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderFttRptData).mockReturnValue({
        header: { listTitle: "title", weekCommencingDate: "", lastUpdatedDate: "", lastUpdatedTime: "" },
        hearings: []
      });

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "ftt-rpt-weekly-hearing-list",
        expect.objectContaining({
          importantInformationText: expect.stringContaining("marketrents@justice.gov.uk"),
          extraInformationText: MARKET_RENTS_EXTRA_INFORMATION_CY
        })
      );
    });
  });
});
