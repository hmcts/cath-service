/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const MINUTE = 60 * 1000;
const NOW = new Date("2026-11-02T12:00:00Z").getTime();
const IDLE_MS = 40 * MINUTE;
const LEAD_MS = 20 * MINUTE;

describe("session-timeout client-side", () => {
  let originalLocation: Location;
  let assign: ReturnType<typeof vi.fn>;
  let addedListeners: Array<{ target: EventTarget; type: string; listener: EventListenerOrEventListenerObject; options?: boolean | AddEventListenerOptions }>;

  async function loadModule() {
    vi.resetModules();
    await import("./session-timeout.js");
  }

  function storedIdleExpiry(): number {
    return Date.parse(window.localStorage.getItem("idleExpiry") ?? "");
  }

  function setIdleExpiry(timestamp: number) {
    window.localStorage.setItem("idleExpiry", new Date(timestamp).toISOString());
  }

  function renderExpiringMarker(redirectType = "SSO", warningLeadMs = String(LEAD_MS)) {
    document.body.innerHTML = `<div id="session-expiring" hidden data-warning-lead-ms="${warningLeadMs}" data-redirect-type="${redirectType}"></div>`;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    document.body.innerHTML = "";
    document.body.removeAttribute("data-session-idle-ms");
    window.localStorage.clear();

    addedListeners = [];
    for (const target of [document, window] as EventTarget[]) {
      const original = target.addEventListener.bind(target);
      vi.spyOn(target, "addEventListener").mockImplementation((type, listener, options) => {
        if (listener) {
          addedListeners.push({ target, type, listener, options });
        }
        original(type, listener, options);
      });
    }

    originalLocation = window.location;
    assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { pathname: "/summary-of-publications", search: "?locationId=9&lng=cy", assign },
      writable: true
    });
  });

  afterEach(() => {
    for (const { target, type, listener, options } of addedListeners) {
      target.removeEventListener(type, listener, options);
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });

  describe("no-op guards", () => {
    it("should do nothing without the idle attribute or the expiring marker", async () => {
      // Act
      await loadModule();
      vi.advanceTimersByTime(300 * MINUTE);

      // Assert
      expect(assign).not.toHaveBeenCalled();
      expect(window.localStorage.getItem("idleExpiry")).toBeNull();
    });

    it.each(["", "abc", "0", "-5", "Infinity"])("should do nothing when the idle attribute is %j", async (value) => {
      // Arrange
      document.body.setAttribute("data-session-idle-ms", value);

      // Act
      await loadModule();
      vi.advanceTimersByTime(300 * MINUTE);

      // Assert
      expect(assign).not.toHaveBeenCalled();
      expect(window.localStorage.getItem("idleExpiry")).toBeNull();
    });

    it("should do nothing on the expiring page when the marker has no redirect type", async () => {
      // Arrange
      renderExpiringMarker("");

      // Act
      await loadModule();
      vi.advanceTimersByTime(300 * MINUTE);

      // Assert
      expect(assign).not.toHaveBeenCalled();
    });

    it("should do nothing on the expiring page when the warning lead is invalid", async () => {
      // Arrange
      renderExpiringMarker("SSO", "abc");

      // Act
      await loadModule();
      vi.advanceTimersByTime(300 * MINUTE);

      // Assert
      expect(assign).not.toHaveBeenCalled();
    });
  });

  describe("idle mode", () => {
    beforeEach(() => {
      document.body.setAttribute("data-session-idle-ms", String(IDLE_MS));
    });

    it("should write idleExpiry on load", async () => {
      // Act
      await loadModule();

      // Assert
      expect(storedIdleExpiry()).toBe(NOW + IDLE_MS);
    });

    it("should not redirect before the idle duration", async () => {
      // Act
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS - 1);

      // Assert
      expect(assign).not.toHaveBeenCalled();
    });

    it("should redirect to /session-expiring with the encoded current path at the idle duration", async () => {
      // Act
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);

      // Assert
      expect(assign).toHaveBeenCalledWith("/session-expiring?currentPath=%2Fsummary-of-publications%3FlocationId%3D9%26lng%3Dcy");
    });

    it("should reschedule instead of redirecting when another tab moved idleExpiry forward", async () => {
      // Arrange
      await loadModule();
      vi.advanceTimersByTime(30 * MINUTE);
      setIdleExpiry(Date.now() + IDLE_MS);

      // Act
      vi.advanceTimersByTime(10 * MINUTE);

      // Assert
      expect(assign).not.toHaveBeenCalled();

      vi.advanceTimersByTime(30 * MINUTE);
      expect(assign).toHaveBeenCalledTimes(1);
    });

    it.each(["click", "mousedown", "mousemove", "keypress", "scroll", "touchstart"])(
      "should reset the timer and rewrite idleExpiry on %s",
      async (eventName) => {
        // Arrange
        await loadModule();
        vi.advanceTimersByTime(30 * MINUTE);

        // Act
        document.dispatchEvent(new Event(eventName));

        // Assert
        expect(storedIdleExpiry()).toBe(NOW + 30 * MINUTE + IDLE_MS);
        vi.advanceTimersByTime(IDLE_MS - 1);
        expect(assign).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(assign).toHaveBeenCalledTimes(1);
      }
    );

    it("should reset the timer on window load", async () => {
      // Arrange
      await loadModule();
      vi.advanceTimersByTime(5 * MINUTE);

      // Act
      window.dispatchEvent(new Event("load"));

      // Assert
      expect(storedIdleExpiry()).toBe(NOW + 5 * MINUTE + IDLE_MS);
    });

    it("should still redirect at the idle duration when localStorage throws", async () => {
      // Arrange
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });

      // Act
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS - 1);
      expect(assign).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);

      // Assert
      expect(assign).toHaveBeenCalledTimes(1);
    });
  });

  describe("expiring mode", () => {
    it("should redirect to /session-expired-logout at idleExpiry plus the warning lead", async () => {
      // Arrange
      setIdleExpiry(NOW);
      renderExpiringMarker("SSO");

      // Act
      await loadModule();
      vi.advanceTimersByTime(LEAD_MS - 1);
      expect(assign).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);

      // Assert
      expect(assign).toHaveBeenCalledWith("/session-expired-logout?redirectType=SSO");
    });

    it("should not reset idleExpiry or the timer on input events", async () => {
      // Arrange
      setIdleExpiry(NOW);
      renderExpiringMarker("CFT");
      await loadModule();

      // Act
      vi.advanceTimersByTime(10 * MINUTE);
      document.dispatchEvent(new Event("click"));
      vi.advanceTimersByTime(10 * MINUTE);

      // Assert
      expect(storedIdleExpiry()).toBe(NOW);
      expect(assign).toHaveBeenCalledWith("/session-expired-logout?redirectType=CFT");
    });

    it("should reschedule when another tab moved idleExpiry forward", async () => {
      // Arrange
      setIdleExpiry(NOW);
      renderExpiringMarker("AAD");
      await loadModule();
      vi.advanceTimersByTime(10 * MINUTE);
      setIdleExpiry(Date.now() + IDLE_MS);

      // Act
      vi.advanceTimersByTime(10 * MINUTE);

      // Assert
      expect(assign).not.toHaveBeenCalled();
      vi.advanceTimersByTime(IDLE_MS + LEAD_MS - 10 * MINUTE);
      expect(assign).toHaveBeenCalledWith("/session-expired-logout?redirectType=AAD");
    });

    it("should redirect immediately when the deadline has already passed", async () => {
      // Arrange
      setIdleExpiry(NOW - 30 * MINUTE);
      renderExpiringMarker("CRIME");

      // Act
      await loadModule();
      vi.advanceTimersByTime(0);

      // Assert
      expect(assign).toHaveBeenCalledWith("/session-expired-logout?redirectType=CRIME");
    });

    it("should fall back to now plus the warning lead when idleExpiry is missing", async () => {
      // Arrange
      renderExpiringMarker("SSO");

      // Act
      await loadModule();
      vi.advanceTimersByTime(LEAD_MS - 1);
      expect(assign).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);

      // Assert
      expect(assign).toHaveBeenCalledWith("/session-expired-logout?redirectType=SSO");
    });

    it("should fall back to now plus the warning lead when localStorage throws", async () => {
      // Arrange
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      renderExpiringMarker("SSO");

      // Act
      await loadModule();
      vi.advanceTimersByTime(LEAD_MS);

      // Assert
      expect(assign).toHaveBeenCalledWith("/session-expired-logout?redirectType=SSO");
    });

    it("should encode the redirect type", async () => {
      // Arrange
      renderExpiringMarker("A&B");

      // Act
      await loadModule();
      vi.advanceTimersByTime(LEAD_MS);

      // Assert
      expect(assign).toHaveBeenCalledWith("/session-expired-logout?redirectType=A%26B");
    });
  });
});
