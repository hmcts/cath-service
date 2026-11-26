import { sendPendingFile } from "@hmcts/admin-pages";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/admin-pages", () => ({
  sendPendingFile: vi.fn()
}));

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN", INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC", INTERNAL_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL" }
}));

describe("non-strategic-upload pending-file", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send the file kept in the current session", async () => {
    // Arrange
    const reference = { id: "kept-id", fileName: "kept-file" };
    const req = { session: { nonStrategicUploadPendingFile: reference } } as unknown as Request;
    const res = {} as Response;
    const handler = GET[GET.length - 1];

    // Act
    await handler(req, res, vi.fn());

    // Assert
    expect(sendPendingFile).toHaveBeenCalledWith(res, "non-strategic-upload", reference);
  });
});
