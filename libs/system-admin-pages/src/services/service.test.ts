import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendPublicationNotifications } from "./service.js";

describe("System Admin Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendPublicationNotifications", () => {
    it("should call console.log with correct artefactId", async () => {
      const consoleSpy = vi.spyOn(console, "log");

      await sendPublicationNotifications("test-artefact-123");

      expect(consoleSpy).toHaveBeenCalledWith("Mock: Sending notifications for artefact test-artefact-123");
    });

    it("should handle different artefactIds", async () => {
      const consoleSpy = vi.spyOn(console, "log");

      await sendPublicationNotifications("another-artefact-456");

      expect(consoleSpy).toHaveBeenCalledWith("Mock: Sending notifications for artefact another-artefact-456");
    });

    it("should return void", async () => {
      const result = await sendPublicationNotifications("test-artefact");

      expect(result).toBeUndefined();
    });

    it("should be callable multiple times", async () => {
      const consoleSpy = vi.spyOn(console, "log");

      await sendPublicationNotifications("artefact-1");
      await sendPublicationNotifications("artefact-2");
      await sendPublicationNotifications("artefact-3");

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, "Mock: Sending notifications for artefact artefact-1");
      expect(consoleSpy).toHaveBeenNthCalledWith(2, "Mock: Sending notifications for artefact artefact-2");
      expect(consoleSpy).toHaveBeenNthCalledWith(3, "Mock: Sending notifications for artefact artefact-3");
    });
  });
});
