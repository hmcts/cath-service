/**
 * Client-side inactivity warning, ported from pip-frontend's inline scripts (bundled for the nonce-based CSP).
 * The server owns the timeout; this only moves the user to /session-expiring and then /session-expired-logout.
 * idleExpiry in localStorage is shared so activity in one tab keeps the others from redirecting.
 */

const IDLE_EXPIRY_KEY = "idleExpiry";
const RESET_EVENTS = ["click", "mousedown", "mousemove", "keypress", "scroll", "touchstart"];

let memoryIdleExpiry: string | null = null;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSessionTimeout);
} else {
  initSessionTimeout();
}

function initSessionTimeout(): void {
  const expiringMarker = document.getElementById("session-expiring");
  if (expiringMarker) {
    initExpiringMode(expiringMarker);
    return;
  }

  const idleMs = Number(document.body.dataset.sessionIdleMs);
  if (Number.isFinite(idleMs) && idleMs > 0) {
    initIdleMode(idleMs);
  }
}

function initIdleMode(idleMs: number): void {
  const schedule = createScheduler(() => {
    const remaining = (readIdleExpiry() ?? 0) - Date.now();
    if (remaining > 0) {
      schedule(remaining);
      return;
    }
    window.location.assign(`/session-expiring?currentPath=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  });

  const resetIdleTimeout = () => {
    writeIdleExpiry(Date.now() + idleMs);
    schedule(idleMs);
  };

  resetIdleTimeout();
  window.addEventListener("load", resetIdleTimeout, true);
  for (const eventName of RESET_EVENTS) {
    document.addEventListener(eventName, resetIdleTimeout, true);
  }
}

function initExpiringMode(marker: HTMLElement): void {
  const warningLeadMs = Number(marker.dataset.warningLeadMs);
  const redirectType = marker.dataset.redirectType;
  if (!Number.isFinite(warningLeadMs) || warningLeadMs <= 0 || !redirectType) {
    return;
  }

  const fallbackDeadline = Date.now() + warningLeadMs;
  const getDeadline = () => {
    const idleExpiry = readIdleExpiry();
    return idleExpiry === null ? fallbackDeadline : idleExpiry + warningLeadMs;
  };

  const schedule = createScheduler(() => {
    const remaining = getDeadline() - Date.now();
    if (remaining > 0) {
      schedule(remaining);
      return;
    }
    window.location.assign(`/session-expired-logout?redirectType=${encodeURIComponent(redirectType)}`);
  });

  schedule(Math.max(0, getDeadline() - Date.now()));
}

function createScheduler(callback: () => void): (delayMs: number) => void {
  let timer: number | undefined;
  return (delayMs: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(callback, delayMs);
  };
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
