import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/list-types-common");

import { getLatestSjpLists } from "@hmcts/list-types-common";

describe("SJP Selection Controller", () => {
  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      ...overrides
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.render = vi.fn().mockReturnValue(res);
    res.locals = { locale: "en" };
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render selection page with no lists when none available", async () => {
      const req = mockRequest();
      const res = mockResponse();

      vi.mocked(getLatestSjpLists).mockResolvedValue([]);

      await GET(req, res);

      expect(getLatestSjpLists).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith("sjp-selection/index", {
        en: expect.any(Object),
        cy: expect.any(Object),
        locale: "en",
        publicLists: [],
        pressLists: []
      });
    });

    it("should render selection page with public lists only", async () => {
      const req = mockRequest();
      const res = mockResponse();

      const mockPublicLists = [
        {
          artefactId: "pub-1",
          listType: "public" as const,
          contentDate: new Date("2025-01-20"),
          publicationDate: new Date("2025-01-20T09:00:00Z"),
          caseCount: 100,
          locationId: 1
        },
        {
          artefactId: "pub-2",
          listType: "public" as const,
          contentDate: new Date("2025-01-19"),
          publicationDate: new Date("2025-01-19T09:00:00Z"),
          caseCount: 50,
          locationId: 2
        }
      ];

      vi.mocked(getLatestSjpLists).mockResolvedValue(mockPublicLists);

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith("sjp-selection/index", {
        en: expect.any(Object),
        cy: expect.any(Object),
        locale: "en",
        publicLists: mockPublicLists,
        pressLists: []
      });
    });

    it("should render selection page with press lists only", async () => {
      const req = mockRequest();
      const res = mockResponse();

      const mockPressLists = [
        {
          artefactId: "press-1",
          listType: "press" as const,
          contentDate: new Date("2025-01-20"),
          publicationDate: new Date("2025-01-20T09:00:00Z"),
          caseCount: 200,
          locationId: 1
        }
      ];

      vi.mocked(getLatestSjpLists).mockResolvedValue(mockPressLists);

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith("sjp-selection/index", {
        en: expect.any(Object),
        cy: expect.any(Object),
        locale: "en",
        publicLists: [],
        pressLists: mockPressLists
      });
    });

    it("should render selection page with both public and press lists", async () => {
      const req = mockRequest();
      const res = mockResponse();

      const mockPublicList = {
        artefactId: "pub-1",
        listType: "public" as const,
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 100,
        locationId: 1
      };

      const mockPressList = {
        artefactId: "press-1",
        listType: "press" as const,
        contentDate: new Date("2025-01-20"),
        publicationDate: new Date("2025-01-20T09:00:00Z"),
        caseCount: 200,
        locationId: 1
      };

      vi.mocked(getLatestSjpLists).mockResolvedValue([mockPublicList, mockPressList]);

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith("sjp-selection/index", {
        en: expect.any(Object),
        cy: expect.any(Object),
        locale: "en",
        publicLists: [mockPublicList],
        pressLists: [mockPressList]
      });
    });

    it("should correctly filter mixed list types", async () => {
      const req = mockRequest();
      const res = mockResponse();

      const mockLists = [
        {
          artefactId: "pub-1",
          listType: "public" as const,
          contentDate: new Date("2025-01-20"),
          publicationDate: new Date("2025-01-20T09:00:00Z"),
          caseCount: 100,
          locationId: 1
        },
        {
          artefactId: "press-1",
          listType: "press" as const,
          contentDate: new Date("2025-01-20"),
          publicationDate: new Date("2025-01-20T09:00:00Z"),
          caseCount: 150,
          locationId: 1
        },
        {
          artefactId: "pub-2",
          listType: "public" as const,
          contentDate: new Date("2025-01-19"),
          publicationDate: new Date("2025-01-19T09:00:00Z"),
          caseCount: 75,
          locationId: 2
        },
        {
          artefactId: "press-2",
          listType: "press" as const,
          contentDate: new Date("2025-01-18"),
          publicationDate: new Date("2025-01-18T09:00:00Z"),
          caseCount: 200,
          locationId: 3
        }
      ];

      vi.mocked(getLatestSjpLists).mockResolvedValue(mockLists);

      await GET(req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as { publicLists: unknown[]; pressLists: unknown[] };

      expect(renderData.publicLists).toHaveLength(2);
      expect(renderData.pressLists).toHaveLength(2);
      expect(renderData.publicLists[0]).toEqual(mockLists[0]);
      expect(renderData.publicLists[1]).toEqual(mockLists[2]);
      expect(renderData.pressLists[0]).toEqual(mockLists[1]);
      expect(renderData.pressLists[1]).toEqual(mockLists[3]);
    });

    it("should use Welsh locale when specified", async () => {
      const req = mockRequest();
      const res = mockResponse();
      res.locals.locale = "cy";

      vi.mocked(getLatestSjpLists).mockResolvedValue([]);

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith("sjp-selection/index", expect.objectContaining({ locale: "cy" }));
    });

    it("should default to English locale", async () => {
      const req = mockRequest();
      const res = mockResponse();
      res.locals.locale = undefined;

      vi.mocked(getLatestSjpLists).mockResolvedValue([]);

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith("sjp-selection/index", expect.objectContaining({ locale: "en" }));
    });
  });
});
