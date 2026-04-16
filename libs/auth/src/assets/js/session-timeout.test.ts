/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("session-timeout client-side", () => {
  let originalLocation: Location;
  let initSessionTimeout: () => void;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();

    // Reset DOM
    document.body.innerHTML = "";
    document.body.removeAttribute("data-authenticated");

    // Mock window.location
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: {
        href: "",
        search: "",
        assign: vi.fn(),
        replace: vi.fn()
      },
      writable: true
    });

    // Clear cookies by setting them to expire in the past
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    // Import fresh module for each test
    const module = await import("./session-timeout.js");
    initSessionTimeout = module.initSessionTimeout;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true
    });
  });

  describe("initSessionTimeout", () => {
    it("should not initialize if page is not authenticated", () => {
      initSessionTimeout();

      const modal = document.getElementById("session-timeout-modal");
      expect(modal).toBeNull();
    });

    it("should create warning modal on authenticated page", () => {
      document.body.dataset.authenticated = "true";

      initSessionTimeout();

      const modal = document.getElementById("session-timeout-modal");
      expect(modal).not.toBeNull();
      expect(modal?.style.display).toBe("none");
    });

    it("should create modal with English content by default", () => {
      document.body.dataset.authenticated = "true";

      initSessionTimeout();

      const modal = document.getElementById("session-timeout-modal");
      expect(modal?.innerHTML).toContain("You will soon be signed out");
      expect(modal?.innerHTML).toContain("Continue");
    });

    it("should create modal with Welsh content when locale cookie is cy", () => {
      document.body.dataset.authenticated = "true";
      document.cookie = "locale=cy";

      initSessionTimeout();

      const modal = document.getElementById("session-timeout-modal");
      expect(modal?.innerHTML).toContain("Byddwch yn cael eich allgofnodi yn fuan");
      expect(modal?.innerHTML).toContain("Parhau");
    });

    it("should create modal with Welsh content when URL has lng=cy", () => {
      document.body.dataset.authenticated = "true";
      Object.defineProperty(window, "location", {
        value: {
          href: "",
          search: "?lng=cy",
          assign: vi.fn(),
          replace: vi.fn()
        },
        writable: true
      });

      initSessionTimeout();

      const modal = document.getElementById("session-timeout-modal");
      expect(modal?.innerHTML).toContain("Byddwch yn cael eich allgofnodi yn fuan");
    });
  });

  describe("warning modal display", () => {
    it("should show warning modal after 25 minutes of inactivity", () => {
      document.body.dataset.authenticated = "true";

      initSessionTimeout();

      const modal = document.getElementById("session-timeout-modal");
      expect(modal?.style.display).toBe("none");

      // Advance time by 25 minutes
      vi.advanceTimersByTime(1500000);

      expect(modal?.style.display).toBe("block");
    });

    it("should display countdown in modal", () => {
      document.body.dataset.authenticated = "true";

      initSessionTimeout();

      // Advance time by 25 minutes to show modal
      vi.advanceTimersByTime(1500000);

      const countdown = document.getElementById("session-timeout-countdown");
      expect(countdown?.textContent).toBe("5:00");
    });

    it("should update countdown every second", () => {
      document.body.dataset.authenticated = "true";

      initSessionTimeout();

      // Advance time by 25 minutes to show modal
      vi.advanceTimersByTime(1500000);

      const countdown = document.getElementById("session-timeout-countdown");
      expect(countdown?.textContent).toBe("5:00");

      // Advance by 1 second
      vi.advanceTimersByTime(1000);
      expect(countdown?.textContent).toBe("4:59");

      // Advance by another second
      vi.advanceTimersByTime(1000);
      expect(countdown?.textContent).toBe("4:58");
    });
  });

  describe("logout behavior", () => {
    it("should redirect to session-expired after 30 minutes of inactivity", () => {
      document.body.dataset.authenticated = "true";

      initSessionTimeout();

      // Advance time by 30 minutes
      vi.advanceTimersByTime(1800000);

      expect(window.location.href).toMatch(/\/session-expired/);
    });

    it("should redirect to Welsh session-expired when locale is cy", () => {
      document.body.dataset.authenticated = "true";
      document.cookie = "locale=cy";

      initSessionTimeout();

      // Advance time by 30 minutes
      vi.advanceTimersByTime(1800000);

      expect(window.location.href).toBe("/session-expired?lng=cy");
    });
  });

  describe("continue button", () => {
    it("should call extend-session API when continue button is clicked", async () => {
      document.body.dataset.authenticated = "true";

      initSessionTimeout();

      // Show modal
      vi.advanceTimersByTime(1500000);

      const continueButton = document.getElementById("session-timeout-continue");
      continueButton?.click();

      expect(fetch).toHaveBeenCalledWith("/api/extend-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
    });

    it("should hide modal after successful session extension", async () => {
      document.body.dataset.authenticated = "true";

      initSessionTimeout();

      // Show modal
      vi.advanceTimersByTime(1500000);

      const modal = document.getElementById("session-timeout-modal");
      expect(modal?.style.display).toBe("block");

      const continueButton = document.getElementById("session-timeout-continue");
      continueButton?.click();

      // Wait for fetch promise to resolve
      await Promise.resolve();
      await Promise.resolve();

      expect(modal?.style.display).toBe("none");
    });

    it("should redirect to session-expired if extend-session fails", async () => {
      document.body.dataset.authenticated = "true";
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      initSessionTimeout();

      // Show modal
      vi.advanceTimersByTime(1500000);

      const continueButton = document.getElementById("session-timeout-continue");
      continueButton?.click();

      // Wait for fetch promise to reject
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalledWith("Failed to extend session:", expect.any(Error));
      expect(window.location.href).toMatch(/\/session-expired/);

      consoleSpy.mockRestore();
    });
  });

  describe("user activity tracking", () => {
    it("should reset timers on user activity when modal is hidden", () => {
      document.body.dataset.authenticated = "true";

      initSessionTimeout();

      // Advance time by 20 minutes (not enough to show modal)
      vi.advanceTimersByTime(1200000);

      // Simulate user activity
      document.dispatchEvent(new MouseEvent("mousedown"));

      // Advance time by another 20 minutes (would have shown modal if timer wasn't reset)
      vi.advanceTimersByTime(1200000);

      const modal = document.getElementById("session-timeout-modal");
      expect(modal?.style.display).toBe("none");
    });

    it("should not reset timers when modal is visible", () => {
      document.body.dataset.authenticated = "true";

      initSessionTimeout();

      // Advance time by 25 minutes to show modal
      vi.advanceTimersByTime(1500000);

      const modal = document.getElementById("session-timeout-modal");
      expect(modal?.style.display).toBe("block");

      // Simulate user activity
      document.dispatchEvent(new MouseEvent("mousedown"));

      // Modal should still be visible
      expect(modal?.style.display).toBe("block");
    });
  });
});
