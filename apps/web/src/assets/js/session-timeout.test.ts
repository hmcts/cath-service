/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const NOW = new Date("2026-11-02T12:00:00Z").getTime();
const IDLE_MS = 10 * MINUTE;
const WARNING_MS = 5 * MINUTE;
const COUNTDOWN_PREFIX = "For your security, you will be signed out in";

const DIALOG_HTML = `
  <dialog id="session-timeout-dialog" aria-labelledby="session-timeout-heading" aria-describedby="session-timeout-countdown"
    data-warning-ms="${WARNING_MS}" data-redirect-type="SSO"
    data-countdown-text="${COUNTDOWN_PREFIX} {time}."
    data-minute-text="minute" data-minutes-text="minutes" data-second-text="second" data-seconds-text="seconds"
    data-error-text="We could not keep you signed in. Try again.">
    <h2 id="session-timeout-heading" tabindex="-1">You're about to be signed out due to inactivity.</h2>
    <p id="session-timeout-countdown"></p>
    <p id="session-timeout-error" hidden></p>
    <div id="session-timeout-announcement" aria-live="polite" aria-atomic="true"></div>
    <button type="button" class="app-session-timeout__continue">Continue</button>
  </dialog>
`;

describe("session-timeout client-side", () => {
  let originalLocation: Location;
  let assign: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let addedListeners: Array<{ target: EventTarget; type: string; listener: EventListenerOrEventListenerObject; options?: boolean | AddEventListenerOptions }>;

  async function loadModule() {
    vi.resetModules();
    await import("./session-timeout.js");
  }

  function renderPage({ idleMs = String(IDLE_MS), dialogHtml = DIALOG_HTML } = {}) {
    document.body.setAttribute("data-session-idle-ms", idleMs);
    document.body.innerHTML = `
      <main id="main-content"><button id="trigger">Do something</button></main>
      ${dialogHtml}
    `;
    (document.getElementById("trigger") as HTMLButtonElement).focus();
  }

  function dialog() {
    return document.getElementById("session-timeout-dialog") as HTMLDialogElement;
  }

  function countdownText() {
    return document.getElementById("session-timeout-countdown")?.textContent;
  }

  function announcementText() {
    return document.getElementById("session-timeout-announcement")?.textContent;
  }

  function storedIdleExpiry(): number {
    return Date.parse(window.localStorage.getItem("idleExpiry") ?? "");
  }

  function clickContinue() {
    (document.querySelector(".app-session-timeout__continue") as HTMLButtonElement).click();
  }

  function respondWith(response: Partial<Response>) {
    fetchMock.mockResolvedValue({ status: 204, type: "basic", ...response });
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

    fetchMock = vi.fn();
    respondWith({ status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    originalLocation = window.location;
    assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { pathname: "/account-home", search: "", href: "http://localhost/account-home", assign },
      writable: true
    });
  });

  afterEach(() => {
    for (const { target, type, listener, options } of addedListeners) {
      target.removeEventListener(type, listener, options);
    }
    if (dialog()?.open) {
      dialog().close();
    }
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });

  describe("no-op guards", () => {
    it("should do nothing without the idle attribute", async () => {
      // Arrange
      document.body.innerHTML = DIALOG_HTML;

      // Act
      await loadModule();
      vi.advanceTimersByTime(60 * MINUTE);

      // Assert
      expect(dialog().open).toBe(false);
      expect(assign).not.toHaveBeenCalled();
      expect(window.localStorage.getItem("idleExpiry")).toBeNull();
    });

    it.each(["", "abc", "0", "-5", "Infinity"])("should do nothing when the idle attribute is %j", async (value) => {
      // Arrange
      renderPage({ idleMs: value });

      // Act
      await loadModule();
      vi.advanceTimersByTime(60 * MINUTE);

      // Assert
      expect(dialog().open).toBe(false);
      expect(assign).not.toHaveBeenCalled();
    });

    it("should do nothing when the dialog is not on the page", async () => {
      // Arrange
      renderPage({ dialogHtml: "" });

      // Act
      await loadModule();
      vi.advanceTimersByTime(60 * MINUTE);

      // Assert
      expect(assign).not.toHaveBeenCalled();
      expect(window.localStorage.getItem("idleExpiry")).toBeNull();
    });

    it("should do nothing when the browser does not support showModal", async () => {
      // Arrange
      renderPage();
      Object.defineProperty(dialog(), "showModal", { value: undefined });

      // Act
      await loadModule();
      vi.advanceTimersByTime(60 * MINUTE);

      // Assert
      expect(assign).not.toHaveBeenCalled();
      expect(window.localStorage.getItem("idleExpiry")).toBeNull();
    });

    it.each([
      ["warning duration is missing", DIALOG_HTML.replace(`data-warning-ms="${WARNING_MS}"`, "")],
      ["redirect type is missing", DIALOG_HTML.replace('data-redirect-type="SSO"', "")]
    ])("should do nothing when the %s", async (_label, dialogHtml) => {
      // Arrange
      renderPage({ dialogHtml });

      // Act
      await loadModule();
      vi.advanceTimersByTime(60 * MINUTE);

      // Assert
      expect(dialog().open).toBe(false);
      expect(assign).not.toHaveBeenCalled();
    });
  });

  describe("opening the warning", () => {
    it("should record when the warning will open on page load", async () => {
      // Arrange
      renderPage();

      // Act
      await loadModule();

      // Assert
      expect(storedIdleExpiry()).toBe(NOW + IDLE_MS);
    });

    it("should not open before the idle duration", async () => {
      // Arrange
      renderPage();
      await loadModule();

      // Act
      vi.advanceTimersByTime(IDLE_MS - SECOND);

      // Assert
      expect(dialog().open).toBe(false);
    });

    it("should open as a modal with focus on the heading and the full countdown after the idle duration", async () => {
      // Arrange
      renderPage();
      await loadModule();

      // Act
      vi.advanceTimersByTime(IDLE_MS);

      // Assert
      expect(dialog().open).toBe(true);
      expect(document.activeElement?.id).toBe("session-timeout-heading");
      expect(countdownText()).toBe(`${COUNTDOWN_PREFIX} 5 minutes 0 seconds.`);
      expect(announcementText()).toBe(`${COUNTDOWN_PREFIX} 5 minutes 0 seconds.`);
    });

    it("should not be delayed by mouse, keyboard or scroll activity", async () => {
      // Arrange
      renderPage();
      await loadModule();

      // Act
      vi.advanceTimersByTime(IDLE_MS - MINUTE);
      for (const type of ["mousemove", "keypress", "scroll", "click", "touchstart"]) {
        document.dispatchEvent(new Event(type));
      }
      vi.advanceTimersByTime(MINUTE);

      // Assert
      expect(dialog().open).toBe(true);
    });
  });

  describe("countdown", () => {
    it("should update the visible countdown every second", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);

      // Act
      vi.advanceTimersByTime(SECOND);

      // Assert
      expect(countdownText()).toBe(`${COUNTDOWN_PREFIX} 4 minutes 59 seconds.`);
      expect(announcementText()).toBe(`${COUNTDOWN_PREFIX} 5 minutes 0 seconds.`);
    });

    it("should use singular units and drop minutes in the last minute", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);

      // Act
      vi.advanceTimersByTime(WARNING_MS - 61 * SECOND);
      const singular = countdownText();
      vi.advanceTimersByTime(2 * SECOND);

      // Assert
      expect(singular).toBe(`${COUNTDOWN_PREFIX} 1 minute 1 second.`);
      expect(countdownText()).toBe(`${COUNTDOWN_PREFIX} 59 seconds.`);
    });

    it("should announce on open, at each whole minute and every 15 seconds in the last minute", async () => {
      // Arrange
      renderPage();
      await loadModule();
      const announcements: string[] = [];

      // Act
      vi.advanceTimersByTime(IDLE_MS);
      for (let elapsed = 0; elapsed < WARNING_MS - SECOND; elapsed += SECOND) {
        const text = announcementText() ?? "";
        if (announcements.at(-1) !== text) {
          announcements.push(text);
        }
        vi.advanceTimersByTime(SECOND);
      }

      // Assert
      expect(announcements.map((text) => text.replace(`${COUNTDOWN_PREFIX} `, ""))).toEqual([
        "5 minutes 0 seconds.",
        "4 minutes 0 seconds.",
        "3 minutes 0 seconds.",
        "2 minutes 0 seconds.",
        "1 minute 0 seconds.",
        "45 seconds.",
        "30 seconds.",
        "15 seconds."
      ]);
    });

    it("should sign the user out with the redirect type when the countdown ends", async () => {
      // Arrange
      renderPage();
      await loadModule();

      // Act
      vi.advanceTimersByTime(IDLE_MS + WARNING_MS);

      // Assert
      expect(assign).toHaveBeenCalledTimes(1);
      expect(assign).toHaveBeenCalledWith("/session-expired-logout?redirectType=SSO");
    });

    it("should schedule sign-out for the end of the countdown rather than relying on the one second ticks", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);
      const setTimeoutSpy = vi.spyOn(window, "setTimeout");

      // Act
      vi.advanceTimersByTime(SECOND);

      // Assert
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), WARNING_MS - SECOND);
    });
  });

  describe("extending the session", () => {
    it("should keep the session alive, close the dialog and return focus when Continue is pressed", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS + MINUTE);

      // Act
      clickContinue();
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      expect(fetchMock).toHaveBeenCalledWith("/session-keep-alive", { method: "POST", credentials: "same-origin", redirect: "manual" });
      expect(dialog().open).toBe(false);
      expect(document.activeElement?.id).toBe("trigger");
      expect(storedIdleExpiry()).toBe(NOW + IDLE_MS + MINUTE + IDLE_MS);
    });

    it("should restart the full idle period after Continue", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);
      clickContinue();
      await vi.advanceTimersByTimeAsync(0);

      // Act
      vi.advanceTimersByTime(WARNING_MS);
      const isOpenAfterOldDeadline = dialog().open;
      vi.advanceTimersByTime(IDLE_MS - WARNING_MS);

      // Assert
      expect(isOpenAfterOldDeadline).toBe(false);
      expect(assign).not.toHaveBeenCalled();
      expect(dialog().open).toBe(true);
    });

    it("should treat Escape as Continue instead of closing the dialog silently", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);
      const cancel = new Event("cancel", { cancelable: true });

      // Act
      dialog().dispatchEvent(cancel);
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      expect(cancel.defaultPrevented).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(dialog().open).toBe(false);
    });

    it("should send a single keep-alive when Continue is pressed twice", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);

      // Act
      clickContinue();
      clickContinue();
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should focus the main content when the previously focused element has gone", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);
      document.getElementById("trigger")?.remove();

      // Act
      clickContinue();
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      expect(document.activeElement?.id).toBe("main-content");
    });

    it.each([
      ["a 401", { status: 401 }],
      ["a redirect from an expired session", { status: 0, type: "opaqueredirect" as ResponseType }]
    ])("should sign the user out when the keep-alive gets %s", async (_label, response) => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);
      respondWith(response);

      // Act
      clickContinue();
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      expect(assign).toHaveBeenCalledWith("/session-expired-logout?redirectType=SSO");
    });

    it.each([
      ["the server errors", () => respondWith({ status: 500 })],
      ["the network fails", () => fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))]
    ])("should keep the dialog open and show an error when %s", async (_label, arrange) => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);
      arrange();

      // Act
      clickContinue();
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      const error = document.getElementById("session-timeout-error") as HTMLElement;
      expect(dialog().open).toBe(true);
      expect(error.hidden).toBe(false);
      expect(error.textContent).toBe("We could not keep you signed in. Try again.");
      expect(announcementText()).toBe("We could not keep you signed in. Try again.");
      expect(assign).not.toHaveBeenCalled();
    });

    it("should clear a previous error when the dialog opens again", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);
      respondWith({ status: 500 });
      clickContinue();
      await vi.advanceTimersByTimeAsync(0);
      respondWith({ status: 204 });
      clickContinue();
      await vi.advanceTimersByTimeAsync(0);

      // Act
      vi.advanceTimersByTime(IDLE_MS);

      // Assert
      expect(dialog().open).toBe(true);
      expect((document.getElementById("session-timeout-error") as HTMLElement).hidden).toBe(true);
    });
  });

  describe("other tabs and sleeping devices", () => {
    it("should close the dialog when another tab extends the session", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);
      window.localStorage.setItem("idleExpiry", new Date(Date.now() + IDLE_MS).toISOString());

      // Act
      window.dispatchEvent(new StorageEvent("storage", { key: "idleExpiry" }));
      vi.advanceTimersByTime(WARNING_MS);

      // Assert
      expect(dialog().open).toBe(false);
      expect(assign).not.toHaveBeenCalled();
    });

    it("should ignore storage events for other keys", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.advanceTimersByTime(IDLE_MS);

      // Act
      window.dispatchEvent(new StorageEvent("storage", { key: "somethingElse" }));

      // Assert
      expect(dialog().open).toBe(true);
    });

    it("should wait for a later warning time written by another tab", async () => {
      // Arrange
      renderPage();
      await loadModule();
      window.localStorage.setItem("idleExpiry", new Date(NOW + IDLE_MS + 2 * MINUTE).toISOString());

      // Act
      vi.advanceTimersByTime(IDLE_MS);
      const isOpenAtOwnIdle = dialog().open;
      vi.advanceTimersByTime(2 * MINUTE);

      // Assert
      expect(isOpenAtOwnIdle).toBe(false);
      expect(dialog().open).toBe(true);
    });

    it("should sign out at once when the page becomes visible after the deadline", async () => {
      // Arrange
      renderPage();
      await loadModule();
      vi.setSystemTime(NOW + IDLE_MS + WARNING_MS + MINUTE);

      // Act
      document.dispatchEvent(new Event("visibilitychange"));

      // Assert
      expect(assign).toHaveBeenCalledWith("/session-expired-logout?redirectType=SSO");
    });

    it("should keep working with an in-memory clock when localStorage is blocked", async () => {
      // Arrange
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      renderPage();
      await loadModule();

      // Act
      vi.advanceTimersByTime(IDLE_MS - SECOND);
      const isOpenEarly = dialog().open;
      vi.advanceTimersByTime(SECOND);

      // Assert
      expect(isOpenEarly).toBe(false);
      expect(dialog().open).toBe(true);
    });
  });
});
