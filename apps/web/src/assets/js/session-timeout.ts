/**
 * Client side of the inactivity timeout warning (MoJ timeout warning pattern, WCAG 2.2.1).
 * The server owns the timeout. The browser clock only restarts on page load, a successful
 * keep-alive or a newer idleExpiry from another tab, so the dialog opens exactly when the server
 * is about to sign the user out. idleExpiry in localStorage is the moment the warning opens.
 */
import { focusTemporarily } from "./back-to-top.js";

const IDLE_EXPIRY_KEY = "idleExpiry";
const DIALOG_ID = "session-timeout-dialog";
const KEEP_ALIVE_URL = "/session-keep-alive";
const TICK_MS = 1000;
const LAST_MINUTE_ANNOUNCE_STEP_SECONDS = 15;

let memoryIdleExpiry: string | null = null;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSessionTimeout);
} else {
  initSessionTimeout();
}

function initSessionTimeout(): void {
  const idleMs = Number(document.body.dataset.sessionIdleMs);
  const dialog = document.getElementById(DIALOG_ID) as HTMLDialogElement | null;
  if (!Number.isFinite(idleMs) || idleMs <= 0 || !dialog || typeof dialog.showModal !== "function") {
    return;
  }

  const settings = readSettings(dialog);
  if (!settings) {
    return;
  }

  createTimeoutWarning(dialog, idleMs, settings);
}

function createTimeoutWarning(dialog: HTMLDialogElement, idleMs: number, settings: DialogSettings): void {
  const countdown = dialog.querySelector<HTMLElement>("#session-timeout-countdown");
  const announcement = dialog.querySelector<HTMLElement>("#session-timeout-announcement");
  const error = dialog.querySelector<HTMLElement>("#session-timeout-error");
  const heading = dialog.querySelector<HTMLElement>("#session-timeout-heading");
  const continueButton = dialog.querySelector<HTMLButtonElement>(".app-session-timeout__continue");

  let timer: number | undefined;
  let signOutTimer: number | undefined;
  let lastAnnouncedBucket: string | null = null;
  let returnFocusTo: Element | null = null;
  let isKeepAlivePending = false;

  const schedule = (delayMs: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(check, Math.max(0, delayMs));
  };

  const restartIdleClock = () => {
    writeIdleExpiry(Date.now() + idleMs);
    schedule(idleMs);
  };

  function check(): void {
    const warningAt = readIdleExpiry() ?? Date.now();
    const remainingMs = warningAt + settings.warningMs - Date.now();

    if (Date.now() < warningAt) {
      closeDialog();
      schedule(warningAt - Date.now());
      return;
    }

    if (remainingMs <= 0) {
      signOut();
      return;
    }

    openDialog();
    updateCountdown(Math.ceil(remainingMs / 1000));
    // A single deadline timer, so throttled ticks in a background tab cannot push sign-out past the server timeout
    window.clearTimeout(signOutTimer);
    signOutTimer = window.setTimeout(signOut, remainingMs);
    schedule(Math.min(TICK_MS, remainingMs));
  }

  function openDialog(): void {
    if (dialog.open) {
      return;
    }
    returnFocusTo = document.activeElement;
    lastAnnouncedBucket = null;
    hideError();
    dialog.showModal();
    heading?.focus();
  }

  function closeDialog(): void {
    window.clearTimeout(signOutTimer);
    if (!dialog.open) {
      return;
    }
    dialog.close();
    if (announcement) {
      announcement.textContent = "";
    }
    restoreFocus(returnFocusTo);
  }

  function updateCountdown(remainingSeconds: number): void {
    const sentence = settings.countdownText.replace("{time}", formatDuration(remainingSeconds, settings));
    if (countdown) {
      countdown.textContent = sentence;
    }

    const bucket = announcementBucket(remainingSeconds);
    if (announcement && bucket !== lastAnnouncedBucket) {
      lastAnnouncedBucket = bucket;
      announcement.textContent = sentence;
    }
  }

  async function keepAlive(): Promise<void> {
    if (isKeepAlivePending) {
      return;
    }
    isKeepAlivePending = true;

    try {
      const response = await fetch(KEEP_ALIVE_URL, { method: "POST", credentials: "same-origin", redirect: "manual" });
      if (response.status === 204) {
        closeDialog();
        restartIdleClock();
      } else if (response.status === 401 || response.type === "opaqueredirect") {
        signOut();
      } else {
        showError();
      }
    } catch {
      showError();
    } finally {
      isKeepAlivePending = false;
    }
  }

  function showError(): void {
    if (error) {
      error.textContent = settings.errorText;
      error.hidden = false;
    }
    if (announcement) {
      announcement.textContent = settings.errorText;
    }
  }

  function hideError(): void {
    if (error) {
      error.hidden = true;
      error.textContent = "";
    }
  }

  function signOut(): void {
    window.clearTimeout(timer);
    window.clearTimeout(signOutTimer);
    window.location.assign(`/session-expired-logout?redirectType=${encodeURIComponent(settings.redirectType)}`);
  }

  continueButton?.addEventListener("click", () => {
    void keepAlive();
  });

  // Esc fires "cancel"; treat it as Continue rather than letting the dialog close silently.
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    void keepAlive();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === IDLE_EXPIRY_KEY) {
      check();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      check();
    }
  });

  restartIdleClock();
}

function readSettings(dialog: HTMLDialogElement): DialogSettings | null {
  const { warningMs, redirectType, countdownText, minuteText, minutesText, secondText, secondsText, errorText } = dialog.dataset;
  const parsedWarningMs = Number(warningMs);
  if (!Number.isFinite(parsedWarningMs) || parsedWarningMs <= 0 || !redirectType || !countdownText) {
    return null;
  }

  return {
    warningMs: parsedWarningMs,
    redirectType,
    countdownText,
    minuteText: minuteText ?? "",
    minutesText: minutesText ?? "",
    secondText: secondText ?? "",
    secondsText: secondsText ?? "",
    errorText: errorText ?? ""
  };
}

function formatDuration(totalSeconds: number, settings: DialogSettings): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const secondsPart = `${seconds} ${seconds === 1 ? settings.secondText : settings.secondsText}`;
  if (minutes === 0) {
    return secondsPart;
  }
  return `${minutes} ${minutes === 1 ? settings.minuteText : settings.minutesText} ${secondsPart}`;
}

// Announce on open, at each whole minute, then every 15 seconds in the last minute (MoJ guidance),
// rather than every second. Buckets survive skipped ticks in throttled background tabs.
function announcementBucket(remainingSeconds: number): string {
  if (remainingSeconds > 60) {
    return `m${Math.ceil(remainingSeconds / 60)}`;
  }
  return `s${Math.ceil(remainingSeconds / LAST_MINUTE_ANNOUNCE_STEP_SECONDS)}`;
}

function restoreFocus(element: Element | null): void {
  if (element instanceof HTMLElement && element !== document.body && element.isConnected) {
    element.focus();
    if (document.activeElement === element) {
      return;
    }
  }

  const main = document.getElementById("main-content");
  if (main) {
    focusTemporarily(main);
  }
}

function readIdleExpiry(): number | null {
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(IDLE_EXPIRY_KEY);
  } catch {
    stored = memoryIdleExpiry;
  }

  const parsed = stored === null ? Number.NaN : Date.parse(stored);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeIdleExpiry(timestamp: number): void {
  const value = new Date(timestamp).toISOString();
  memoryIdleExpiry = value;
  try {
    window.localStorage.setItem(IDLE_EXPIRY_KEY, value);
  } catch {
    // Storage blocked (e.g. Safari private mode): keep the in-memory value; only cross-tab sync is lost
  }
}

interface DialogSettings {
  warningMs: number;
  redirectType: string;
  countdownText: string;
  minuteText: string;
  minutesText: string;
  secondText: string;
  secondsText: string;
  errorText: string;
}
