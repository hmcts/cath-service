import { readFile } from "node:fs/promises";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("node:fs/promises");
vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => vi.fn((_req, _res, next) => next())),
  USER_ROLES: { VERIFIED: "VERIFIED" }
}));
vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefact: {
      findUnique: vi.fn()
    }
  }
}));
vi.mock("@hmcts/list-types-common", async () => {
  const actual = await vi.importActual("@hmcts/list-types-common");
  return {
    ...actual,
    calculatePagination: vi.fn(),
    determineListType: vi.fn(),
    extractPressCases: vi.fn()
  };
});
vi.mock("../validation/json-validator.js");
vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL: "Manual Upload",
    API: "API Upload"
  }
}));

import { calculatePagination, determineListType, extractPressCases } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres";
import { validateSjpPressList } from "../validation/json-validator.js";

describe("SJP Press List Controller", () => {
  // GET and POST are arrays: [requireRole middleware, handler]
  const getHandler = GET[1];
  const postHandler = POST[1];

  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      body: {},
      ...overrides
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.render = vi.fn().mockReturnValue(res);
    res.redirect = vi.fn().mockReturnValue(res);
    res.locals = { locale: "en" };
    return res;
  };

  const mockJsonData = {
    document: {
      publicationDate: "2025-01-20T09:00:00.000Z",
      documentName: "SJP Press List",
      version: "1.0"
    },
    courtLists: [
      {
        courtHouse: {
          courtRoom: [
            {
              session: [
                {
                  sittings: [
                    {
                      hearing: [
                        {
                          case: [
                            {
                              caseNumber: "12345678",
                              defendant: {
                                individualDetails: {
                                  individualForenames: "John",
                                  individualSurname: "Doe",
                                  dateOfBirth: "1990-01-01",
                                  address: {
                                    line: ["123 Test Street"],
                                    postCode: "SW1A 1AA"
                                  }
                                }
                              },
                              prosecutionCaseReference: "REF123",
                              offence: [
                                {
                                  offenceTitle: "Speeding",
                                  offenceWording: "Exceeded speed limit"
                                }
                              ],
                              prosecutor: "CPS"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  };

  const mockCases = [
    {
      caseId: "case-1",
      name: "John Doe",
      postcode: "SW1A",
      prosecutor: "CPS",
      dateOfBirth: new Date("1990-01-01"),
      age: 35,
      reference: "REF123",
      address: "123 Test St, London",
      offences: [{ offenceTitle: "Speeding", offenceWording: "Exceeded speed limit", reportingRestriction: false }]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render 400 error when artefactId is missing", async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      await getHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/400", expect.objectContaining({ locale: "en" }));
    });

    it("should render 404 error when list is not found", async () => {
      const req = mockRequest({ query: { artefactId: "nonexistent" } });
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

      await getHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404", expect.objectContaining({ locale: "en" }));
    });

    it("should render 404 error when list type is not press", async () => {
      const req = mockRequest({ query: { artefactId: "test-123" } });
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
        artefactId: "test-123",
        locationId: "1",
        contentDate: new Date("2025-01-20"),
        provenance: "MANUAL"
      } as never);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateSjpPressList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" });
      vi.mocked(determineListType).mockReturnValue("public");

      await getHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404", expect.objectContaining({ locale: "en" }));
    });

    it("should render press list with cases and pagination", async () => {
      const req = mockRequest({
        query: { artefactId: "test-123", page: "2" }
      });
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
        artefactId: "test-123",
        locationId: "1",
        contentDate: new Date("2025-01-20"),
        provenance: "MANUAL"
      } as never);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateSjpPressList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" });
      vi.mocked(determineListType).mockReturnValue("press");
      vi.mocked(extractPressCases).mockReturnValue(mockCases);
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 2,
        totalPages: 2,
        totalItems: 300,
        itemsPerPage: 200,
        hasNext: false,
        hasPrevious: true,
        pageNumbers: [1, 2]
      });

      await getHandler(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "sjp-press-list",
        expect.objectContaining({
          cases: [],
          pagination: expect.any(Object),
          filters: { searchQuery: undefined, postcodes: [], prosecutors: [] },
          errors: undefined,
          dataSource: "Manual Upload"
        })
      );
    });

    it("should apply filters from query parameters", async () => {
      const req = mockRequest({
        query: {
          artefactId: "test-123",
          page: "1",
          search: "Smith",
          postcode: "SW1A",
          prosecutor: "CPS"
        }
      });
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
        artefactId: "test-123",
        locationId: "1",
        contentDate: new Date("2025-01-20"),
        provenance: "MANUAL"
      } as never);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateSjpPressList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" });
      vi.mocked(determineListType).mockReturnValue("press");
      vi.mocked(extractPressCases).mockReturnValue(mockCases);
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 200,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
      });

      await getHandler(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "sjp-press-list",
        expect.objectContaining({
          filters: { searchQuery: "Smith", postcodes: ["SW1A"], prosecutors: ["CPS"] }
        })
      );
    });

    it("should use Welsh translations when locale is cy", async () => {
      const req = mockRequest({
        query: { artefactId: "test-123" }
      });
      const res = mockResponse();
      res.locals.locale = "cy";

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
        artefactId: "test-123",
        locationId: "1",
        contentDate: new Date("2025-01-20"),
        provenance: "MANUAL"
      } as never);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateSjpPressList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" });
      vi.mocked(determineListType).mockReturnValue("press");
      vi.mocked(extractPressCases).mockReturnValue(mockCases);
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 200,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
      });

      await getHandler(req, res);

      expect(res.render).toHaveBeenCalledWith("sjp-press-list", expect.objectContaining({ locale: "cy" }));
    });
  });

  describe("POST", () => {
    it("should redirect with artefactId only when no filters provided", async () => {
      const req = mockRequest({
        body: { artefactId: "test-123" }
      });
      const res = mockResponse();

      await postHandler(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list?artefactId=test-123");
    });

    it("should redirect with all filter parameters", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          search: "  Smith  ",
          postcode: "SW1A",
          prosecutor: "CPS"
        }
      });
      const res = mockResponse();

      await postHandler(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list?artefactId=test-123&search=Smith&postcode=SW1A&prosecutor=CPS");
    });

    it("should trim search query whitespace", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          search: "  test query  "
        }
      });
      const res = mockResponse();

      await postHandler(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list?artefactId=test-123&search=test+query");
    });

    it("should skip empty filter parameters", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          search: "",
          postcode: undefined,
          prosecutor: null
        }
      });
      const res = mockResponse();

      await postHandler(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list?artefactId=test-123");
    });
  });
});
