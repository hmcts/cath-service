import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "../../list-type/queries.js";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: {
    SYSTEM_ADMIN: "system-admin"
  }
}));

vi.mock("../../list-type/queries.js");

describe("view-list-types", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      query: {}
    };
    res = {
      render: vi.fn()
    };
  });

  it("should render view-list-types page with list types", async () => {
    const mockListTypes = [
      {
        id: 1,
        name: "TEST_LIST",
        friendlyName: "Test List",
        welshFriendlyName: "Rhestr Prawf",
        shortenedFriendlyName: "Test",
        url: "test-list",
        defaultSensitivity: "Public",
        allowedProvenance: "CFT_IDAM",
        isNonStrategic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        subJurisdictions: [
          {
            id: 1,
            listTypeId: 1,
            subJurisdictionId: 1,
            subJurisdiction: {
              subJurisdictionId: 1,
              name: "Civil Court",
              welshName: "Llys Sifil",
              jurisdictionId: 1
            }
          }
        ]
      }
    ];

    vi.mocked(queries.findAllListTypes).mockResolvedValue(mockListTypes as any);

    const handler = GET[1];
    await handler(req as Request, res as Response, vi.fn());

    expect(res.render).toHaveBeenCalledWith(
      "view-list-types/index",
      expect.objectContaining({
        tableRows: expect.arrayContaining([expect.arrayContaining([{ text: "TEST_LIST" }, { text: "Test List" }])])
      })
    );
  });

  it("should handle Welsh language", async () => {
    req.query = { lng: "cy" };
    vi.mocked(queries.findAllListTypes).mockResolvedValue([]);

    const handler = GET[1];
    await handler(req as Request, res as Response, vi.fn());

    expect(res.render).toHaveBeenCalledWith(
      "view-list-types/index",
      expect.objectContaining({
        title: "Gweld Mathau o Restrau"
      })
    );
  });
});
