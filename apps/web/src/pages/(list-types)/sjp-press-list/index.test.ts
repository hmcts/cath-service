import { readFile } from "node:fs/promises";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("node:fs/promises");
vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefact: {
      findUnique: vi.fn()
    },
    listType: {
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
vi.mock("@hmcts/sjp-press-list", async () => {
  const actual = await vi.importActual("@hmcts/sjp-press-list");
  return {
    ...actual,
    validateSjpPressList: vi.fn()
  };
});

import { calculatePagination, determineListType, extractPressCases } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres-prisma";
import { validateSjpPressList } from "@hmcts/sjp-press-list";

describe("SJP Press List Controller", () => {
  const getHandler = GET[1];
  const postHandler = POST[1];

  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      body: {},
      path: "/sjp-press-list",
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
        provenance: "MANUAL_UPLOAD"
      } as never);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockJsonData));
      vi.mocked(validateSjpPressList).mockReturnValue({ isValid: true, errors: [], schemaVersion: "1.0" });
      vi.mocked(determineListType).mockReturnValue("press");
      vi.mocked(extractPressCases).mockReturnValue(mockCases);
      vi.mocked(calculatePagination).mockReturnValue({
        currentPage: 2,
        totalPages: 2,
        totalItems: 300,
        itemsPerPage: 1000,
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
          filters: { postcodes: [], prosecutors: [] },
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
        itemsPerPage: 1000,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
      });

      await getHandler(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "sjp-press-list",
        expect.objectContaining({
          filters: { postcodes: ["SW1A"], prosecutors: ["CPS"] }
        })
      );
    });

    it("should pass showFilter=true to template when showFilter query param is set", async () => {
      const req = mockRequest({
        query: { artefactId: "test-123", showFilter: "true" }
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
        itemsPerPage: 1000,
        hasNext: false,
        hasPrevious: false,
        pageNumbers: [1]
      });

      await getHandler(req, res);

      expect(res.render).toHaveBeenCalledWith("sjp-press-list", expect.objectContaining({ showFilter: true }));
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
        itemsPerPage: 1000,
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
          postcode: "SW1A",
          prosecutor: "CPS"
        }
      });
      const res = mockResponse();

      await postHandler(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list?artefactId=test-123&postcode=SW1A&prosecutor=CPS");
    });

    it("should trim postcode whitespace", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          postcode: "  M1  "
        }
      });
      const res = mockResponse();

      await postHandler(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list?artefactId=test-123&postcode=M1");
    });

    it("should skip empty filter parameters", async () => {
      const req = mockRequest({
        body: {
          artefactId: "test-123",
          postcode: undefined,
          prosecutor: null
        }
      });
      const res = mockResponse();

      await postHandler(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list?artefactId=test-123");
    });
  });

  describe("requireVerifiedWithProvenance middleware", () => {
    const middleware = GET[0];

    const mockNext = vi.fn() as unknown as NextFunction;

    it("should allow system admin to bypass provenance check", async () => {
      const req = mockRequest({
        query: { artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
        user: { role: "SYSTEM_ADMIN" }
      } as Partial<Request>);
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should redirect to sign-in when user is not verified", async () => {
      const req = mockRequest({
        query: { artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
        user: { role: "BASIC" },
        originalUrl: "/sjp-press-list?artefactId=a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should redirect to sign-in when user has no provenance", async () => {
      const req = mockRequest({
        query: { artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
        user: { role: "VERIFIED", provenance: undefined },
        originalUrl: "/sjp-press-list?artefactId=a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should redirect to sign-in when artefactId is missing", async () => {
      const req = mockRequest({
        query: {},
        user: { role: "VERIFIED", provenance: "PI_AAD" },
        originalUrl: "/sjp-press-list",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should redirect to sign-in when artefactId is not a valid UUID", async () => {
      const req = mockRequest({
        query: { artefactId: "invalid-id" },
        user: { role: "VERIFIED", provenance: "PI_AAD" },
        originalUrl: "/sjp-press-list?artefactId=invalid-id",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should redirect to sign-in when artefact is not found", async () => {
      const req = mockRequest({
        query: { artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
        user: { role: "VERIFIED", provenance: "PI_AAD" },
        originalUrl: "/sjp-press-list?artefactId=a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

      await middleware(req, res, mockNext);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should redirect to sign-in when list type is not found", async () => {
      const req = mockRequest({
        query: { artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
        user: { role: "VERIFIED", provenance: "PI_AAD" },
        originalUrl: "/sjp-press-list?artefactId=a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", listTypeId: 24 } as never);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);

      await middleware(req, res, mockNext);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should redirect to sign-in when user provenance does not match allowed provenance", async () => {
      const req = mockRequest({
        query: { artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
        user: { role: "VERIFIED", provenance: "CRIME_IDAM" },
        originalUrl: "/sjp-press-list?artefactId=a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", listTypeId: 24 } as never);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 24, allowedProvenance: "PI_AAD" } as never);

      await middleware(req, res, mockNext);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should call next when user provenance matches allowed provenance", async () => {
      const req = mockRequest({
        query: { artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
        user: { role: "VERIFIED", provenance: "PI_AAD" },
        originalUrl: "/sjp-press-list?artefactId=a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", listTypeId: 24 } as never);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 24, allowedProvenance: "PI_AAD" } as never);

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should support comma-separated allowed provenance", async () => {
      const req = mockRequest({
        query: { artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
        user: { role: "VERIFIED", provenance: "CFT_IDAM" },
        originalUrl: "/sjp-press-list?artefactId=a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ artefactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", listTypeId: 24 } as never);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 24, allowedProvenance: "PI_AAD,CFT_IDAM" } as never);

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });
});
