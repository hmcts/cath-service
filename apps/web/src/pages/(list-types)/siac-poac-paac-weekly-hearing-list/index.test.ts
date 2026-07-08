import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/list-types-common", () => ({
  createJsonValidator: () => mockValidate,
  provenanceLabelsEn: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform", CP_CATH: "Libra", PDDA: "PDDA" },
  provenanceLabelsCy: { MANUAL_UPLOAD: "Lanlwytho â Llaw", SNL: "ListAssist", COMMON_PLATFORM: "Common Platform", CP_CATH: "Libra", PDDA: "PDDA" }
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  getPublicationJson: vi.fn(),
  PROVENANCE_LABELS: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist" }
}));

vi.mock("@hmcts/siac-poac-paac-weekly-hearing-list", () => ({
  siacPoacPaacWeeklyHearingListEn: {
    siacCourtName: "Special Immigration Appeals Commission",
    poacCourtName: "Proscribed Organisations Appeal Commission",
    paacCourtName: "Pathogens Access Appeal Commission",
    siacPageTitle: "Special Immigration Appeals Commission Weekly Hearing List",
    poacPageTitle: "Proscribed Organisations Appeal Commission Weekly Hearing List",
    paacPageTitle: "Pathogens Access Appeal Commission Weekly Hearing List",
    provenanceLabels: { MANUAL_UPLOAD: "Manual Upload", SNL: "ListAssist" },
    importantInformationText: "The tribunal sometimes uses reference numbers or initials to protect the anonymity of those involved in the appeal.",
    importantInformationVenue: "All hearings take place at Field House, 15-25 Bream's Buildings, London EC4A 1DZ."
  },
  siacPoacPaacWeeklyHearingListCy: {
    siacCourtName: "Special Immigration Appeals Commission",
    poacCourtName: "Proscribed Organisations Appeal Commission",
    paacCourtName: "Pathogens Access Appeal Commission",
    siacPageTitle: "Special Immigration Appeals Commission Weekly Hearing List",
    poacPageTitle: "Proscribed Organisations Appeal Commission Weekly Hearing List",
    paacPageTitle: "Pathogens Access Appeal Commission Weekly Hearing List",
    provenanceLabels: { MANUAL_UPLOAD: "Lanlwytho â Llaw", SNL: "ListAssist" },
    importantInformationText: "The tribunal sometimes uses reference numbers or initials to protect the anonymity of those involved in the appeal.",
    importantInformationVenue: "All hearings take place at Field House, 15-25 Bream's Buildings, London EC4A 1DZ."
  },
  renderSiacPoacPaacData: vi.fn()
}));

import { getArtefactById, getPublicationJson } from "@hmcts/publication";
import { renderSiacPoacPaacData } from "@hmcts/siac-poac-paac-weekly-hearing-list";
import { GET } from "./index.js";

const LIST_TYPE_CASES = [
  {
    listTypeId: 28,
    listTypeName: "SIAC_WEEKLY_HEARING_LIST",
    courtName: "Special Immigration Appeals Commission",
    listTitle: "Special Immigration Appeals Commission Weekly Hearing List"
  },
  {
    listTypeId: 29,
    listTypeName: "POAC_WEEKLY_HEARING_LIST",
    courtName: "Proscribed Organisations Appeal Commission",
    listTitle: "Proscribed Organisations Appeal Commission Weekly Hearing List"
  },
  {
    listTypeId: 30,
    listTypeName: "PAAC_WEEKLY_HEARING_LIST",
    courtName: "Pathogens Access Appeal Commission",
    listTitle: "Pathogens Access Appeal Commission Weekly Hearing List"
  }
];

const MOCK_JSON_DATA = [
  {
    date: "01/01/2026",
    time: "10:00am",
    appellant: "Smith v Secretary of State",
    caseReferenceNumber: "SC/00001/2026",
    hearingType: "Substantive hearing",
    courtroom: "Court 1",
    additionalInformation: ""
  }
];

describe("SIAC/POAC/PAAC Weekly Hearing List page controller", () => {
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
        listTypeId: 28,
        listTypeName: "SIAC_WEEKLY_HEARING_LIST",
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
        listTypeId: 28,
        listTypeName: "SIAC_WEEKLY_HEARING_LIST",
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
      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId: "test-id",
        listTypeId: 28,
        listTypeName: "SIAC_WEEKLY_HEARING_LIST",
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      } as any);
      vi.mocked(getPublicationJson).mockResolvedValue(MOCK_JSON_DATA);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderSiacPoacPaacData).mockReturnValue({
        header: { listTitle: "title", weekCommencingDate: "", lastUpdatedDate: "", lastUpdatedTime: "" },
        hearings: []
      } as any);

      // Act
      req.query = { artefactId: "test-id" };
      await GET(req as Request, res as Response);

      // Assert
      expect(renderSiacPoacPaacData).toHaveBeenCalledWith(MOCK_JSON_DATA, expect.objectContaining({ locale: "cy" }));
      expect(res.render).toHaveBeenCalledWith("siac-poac-paac-weekly-hearing-list", expect.objectContaining({ dataSource: "Lanlwytho â Llaw" }));
    });

    it("should pass importantInformationText and importantInformationVenue as separate fields to the template", async () => {
      // Arrange
      req.query = { artefactId: "test-id" };
      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId: "test-id",
        listTypeId: 28,
        listTypeName: "SIAC_WEEKLY_HEARING_LIST",
        contentDate: new Date("2026-01-01"),
        lastReceivedDate: new Date("2026-01-01T12:00:00Z"),
        provenance: "MANUAL_UPLOAD"
      } as any);
      vi.mocked(getPublicationJson).mockResolvedValue(MOCK_JSON_DATA);
      mockValidate.mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(renderSiacPoacPaacData).mockReturnValue({
        header: { listTitle: "title", weekCommencingDate: "", lastUpdatedDate: "", lastUpdatedTime: "" },
        hearings: []
      } as any);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "siac-poac-paac-weekly-hearing-list",
        expect.objectContaining({
          en: expect.objectContaining({
            importantInformationText: expect.not.stringContaining("Field House"),
            importantInformationVenue: "All hearings take place at Field House, 15-25 Bream's Buildings, London EC4A 1DZ."
          })
        })
      );
    });

    for (const { listTypeId, listTypeName, courtName, listTitle } of LIST_TYPE_CASES) {
      it(`should render correctly for ${listTypeName} (${courtName})`, async () => {
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
        vi.mocked(renderSiacPoacPaacData).mockReturnValue(mockRenderedData as any);

        // Act
        await GET(req as Request, res as Response);

        // Assert
        expect(getPublicationJson).toHaveBeenCalledWith(`test-artefact-${listTypeId}`);
        expect(renderSiacPoacPaacData).toHaveBeenCalledWith(MOCK_JSON_DATA, expect.objectContaining({ courtName }));
        expect(res.render).toHaveBeenCalledWith("siac-poac-paac-weekly-hearing-list", expect.objectContaining({ dataSource: "Manual Upload" }));
      });
    }
  });
});
