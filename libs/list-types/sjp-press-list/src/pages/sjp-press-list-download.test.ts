import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./sjp-press-list-download.js";

vi.mock("@hmcts/sjp-common");

import { getSjpListById, getSjpPressCases } from "@hmcts/sjp-common";

describe("SJP Press List Download Controller", () => {
  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      isAuthenticated: vi.fn(() => true),
      user: { role: "VERIFIED" },
      ...overrides
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "production";
  });

  describe("GET", () => {
    it("should return 403 when user is not authenticated in production", async () => {
      const req = mockRequest({ isAuthenticated: vi.fn(() => false) });
      const res = mockResponse();

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith("Forbidden");
    });

    it("should return 403 when user is not VERIFIED in production", async () => {
      const req = mockRequest({ user: { role: "MEDIA" } });
      const res = mockResponse();

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith("Forbidden");
    });

    it("should skip authentication check in development mode", async () => {
      process.env.NODE_ENV = "development";
      const req = mockRequest({
        isAuthenticated: vi.fn(() => false),
        query: { artefactId: "test-123" }
      });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "press",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPressCases).mockResolvedValue({
        cases: [],
        totalCases: 0
      });

      await GET(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
    });

    it("should return 400 when artefactId is missing", async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Bad Request");
    });

    it("should return 404 when list is not found", async () => {
      const req = mockRequest({ query: { artefactId: "nonexistent" } });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue(null);

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("Not Found");
    });

    it("should return 404 when list type is not press", async () => {
      const req = mockRequest({ query: { artefactId: "test-123" } });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "public",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("Not Found");
    });

    it("should generate CSV with correct headers and data", async () => {
      const req = mockRequest({ query: { artefactId: "test-123" } });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "press",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPressCases).mockResolvedValue({
        cases: [
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
        ],
        totalCases: 1
      });

      await GET(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="sjp-press-list-2025-01-20.csv"');

      const csvCall = vi.mocked(res.send).mock.calls[0]?.[0] as string;
      expect(csvCall).toContain("Name,Date of Birth,Reference,Address,Prosecutor,Reporting Restriction,Offence");
      expect(csvCall).toContain('"John Doe"');
      expect(csvCall).toContain('"01/01/1990"');
      expect(csvCall).toContain('"REF123"');
      expect(csvCall).toContain('"123 Test St, London"');
      expect(csvCall).toContain('"CPS"');
      expect(csvCall).toContain("False");
      expect(csvCall).toContain('"Speeding"');
    });

    it("should handle multiple offences in CSV", async () => {
      const req = mockRequest({ query: { artefactId: "test-123" } });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "press",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPressCases).mockResolvedValue({
        cases: [
          {
            caseId: "case-1",
            name: "John Doe",
            postcode: "SW1A",
            prosecutor: "CPS",
            dateOfBirth: new Date("1990-01-01"),
            age: 35,
            reference: "REF123",
            address: "123 Test St, London",
            offences: [
              { offenceTitle: "Speeding", offenceWording: "Exceeded speed limit", reportingRestriction: false },
              { offenceTitle: "No insurance", offenceWording: null, reportingRestriction: false }
            ]
          }
        ],
        totalCases: 1
      });

      await GET(req, res);

      const csvCall = vi.mocked(res.send).mock.calls[0]?.[0] as string;
      expect(csvCall).toContain('"Speeding; No insurance"');
    });

    it("should set reporting restriction to True when any offence has restriction", async () => {
      const req = mockRequest({ query: { artefactId: "test-123" } });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "press",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPressCases).mockResolvedValue({
        cases: [
          {
            caseId: "case-1",
            name: "John Doe",
            postcode: "SW1A",
            prosecutor: "CPS",
            dateOfBirth: new Date("1990-01-01"),
            age: 35,
            reference: "REF123",
            address: "123 Test St, London",
            offences: [
              { offenceTitle: "Offence 1", offenceWording: null, reportingRestriction: false },
              { offenceTitle: "Offence 2", offenceWording: null, reportingRestriction: true }
            ]
          }
        ],
        totalCases: 1
      });

      await GET(req, res);

      const csvCall = vi.mocked(res.send).mock.calls[0]?.[0] as string;
      const lines = csvCall.split("\n");
      expect(lines[1]).toContain("True");
    });

    it("should handle null values in CSV", async () => {
      const req = mockRequest({ query: { artefactId: "test-123" } });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "press",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPressCases).mockResolvedValue({
        cases: [
          {
            caseId: "case-1",
            name: "John Doe",
            postcode: "SW1A",
            prosecutor: null,
            dateOfBirth: null,
            age: 0,
            reference: null,
            address: null,
            offences: []
          }
        ],
        totalCases: 1
      });

      await GET(req, res);

      const csvCall = vi.mocked(res.send).mock.calls[0]?.[0] as string;
      const lines = csvCall.split("\n");
      expect(lines[1]).toContain('"John Doe",,"","","",False,""');
    });

    it("should apply filters when provided", async () => {
      const req = mockRequest({
        query: {
          artefactId: "test-123",
          search: "Smith",
          postcode: "SW1A",
          prosecutor: "CPS"
        }
      });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "press",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPressCases).mockResolvedValue({
        cases: [],
        totalCases: 0
      });

      await GET(req, res);

      expect(getSjpPressCases).toHaveBeenCalledWith("test-123", { searchQuery: "Smith", postcode: "SW1A", prosecutor: "CPS" }, 1);
    });

    it("should format filename with content date", async () => {
      const req = mockRequest({ query: { artefactId: "test-123" } });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "press",
        contentDate: new Date("2025-12-25"),
        publicationDate: new Date("2025-12-25T09:00:00Z"),
        caseCount: 10,
        locationId: 1
      });

      vi.mocked(getSjpPressCases).mockResolvedValue({
        cases: [],
        totalCases: 0
      });

      await GET(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="sjp-press-list-2025-12-25.csv"');
    });

    it("should generate empty CSV when no cases found", async () => {
      const req = mockRequest({ query: { artefactId: "test-123" } });
      const res = mockResponse();

      vi.mocked(getSjpListById).mockResolvedValue({
        artefactId: "test-123",
        listType: "press",
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 0,
        locationId: 1
      });

      vi.mocked(getSjpPressCases).mockResolvedValue({
        cases: [],
        totalCases: 0
      });

      await GET(req, res);

      const csvCall = vi.mocked(res.send).mock.calls[0]?.[0] as string;
      const lines = csvCall.split("\n");
      expect(lines).toHaveLength(1); // Only header
      expect(lines[0]).toBe("Name,Date of Birth,Reference,Address,Prosecutor,Reporting Restriction,Offence");
    });
  });
});
