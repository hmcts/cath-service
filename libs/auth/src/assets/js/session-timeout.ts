/**
 * Client-side session timeout tracking
 * Monitors user inactivity and displays warning modal before auto-logout
 */

const WARNING_THRESHOLD_MS = 1500000; // 25 minutes
const LOGOUT_THRESHOLD_MS = 1800000; // 30 minutes
const WARNING_DURATION_MS = LOGOUT_THRESHOLD_MS - WARNING_THRESHOLD_MS; // 5 minutes

const translations = {
  en: {
    heading: "You will soon be signed out, due to inactivity",
    bodyText: "You will be signed out in",
    continueButton: "Continue"
  },
  cy: {
    heading: "Byddwch yn cael eich allgofnodi yn fuan, oherwydd anweithgarwch",
    bodyText: "Byddwch yn cael eich allgofnodi mewn",
    continueButton: "Parhau"
  }
};

interface SessionTimeoutState {
  warningTimer: number | null;
  logoutTimer: number | null;
  modalElement: HTMLElement | null;
  countdownElement: HTMLElement | null;
  countdownInterval: number | null;
}

const state: SessionTimeoutState = {
  warningTimer: null,
  logoutTimer: null,
  modalElement: null,
  countdownElement: null,
  countdownInterval: null
};

/**
 * Initializes session timeout tracking
 */
export function initSessionTimeout(): void {
  // Only run on authenticated pages
  if (!document.body.dataset.authenticated) {
    return;
  }

  // Create warning modal
  createWarningModal();

  // Start timeout timers
  resetTimers();

  // Track user activity
  trackUserActivity();
}

/**
 * Gets the current locale from cookie or URL
 */
function getCurrentLocale(): "en" | "cy" {
  const urlParams = new URLSearchParams(window.location.search);
  const urlLocale = urlParams.get("lng");
  if (urlLocale === "cy") {
    return "cy";
  }

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "locale" && value === "cy") {
      return "cy";
    }
  }

  return "en";
}

/**
 * Creates the warning modal element
 */
function createWarningModal(): void {
  const locale = getCurrentLocale();
  const t = translations[locale];

  const modal = document.createElement("div");
  modal.id = "session-timeout-modal";
  modal.className = "session-timeout-modal";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="session-timeout-overlay"></div>
    <div class="session-timeout-content govuk-!-padding-4">
      <h2 class="govuk-heading-m">${t.heading}</h2>
      <p class="govuk-body">${t.bodyText} <strong id="session-timeout-countdown"></strong>.</p>
      <button id="session-timeout-continue" class="govuk-button" type="button">
        ${t.continueButton}
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  state.modalElement = modal;
  state.countdownElement = document.getElementById("session-timeout-countdown");

  // Add event listener to continue button
  const continueButton = document.getElementById("session-timeout-continue");
  if (continueButton) {
    continueButton.addEventListener("click", handleContinue);
  }
}

/**
 * Tracks user activity to reset timeout
 */
function trackUserActivity(): void {
  const events = ["mousedown", "keydown", "scroll", "touchstart"];

  for (const event of events) {
    document.addEventListener(event, () => {
      // Only reset if modal is not showing
      if (state.modalElement && state.modalElement.style.display === "none") {
        resetTimers();
      }
    });
  }
}

/**
 * Resets the timeout timers
 */
function resetTimers(): void {
  // Clear existing timers
  if (state.warningTimer) {
    clearTimeout(state.warningTimer);
  }
  if (state.logoutTimer) {
    clearTimeout(state.logoutTimer);
  }
  if (state.countdownInterval) {
    clearInterval(state.countdownInterval);
  }

  // Hide modal
  if (state.modalElement) {
    state.modalElement.style.display = "none";
  }

  // Set new timers
  state.warningTimer = window.setTimeout(showWarning, WARNING_THRESHOLD_MS);
  state.logoutTimer = window.setTimeout(logout, LOGOUT_THRESHOLD_MS);
}

/**
 * Shows the warning modal
 */
function showWarning(): void {
  if (!state.modalElement) {
    return;
  }

  state.modalElement.style.display = "block";

  // Start countdown
  let remainingMs = WARNING_DURATION_MS;
  updateCountdown(remainingMs);

  state.countdownInterval = window.setInterval(() => {
    remainingMs -= 1000;
    if (remainingMs <= 0) {
      if (state.countdownInterval) {
        clearInterval(state.countdownInterval);
      }
      return;
    }
    updateCountdown(remainingMs);
  }, 1000);
}

/**
 * Updates the countdown display
 */
function updateCountdown(ms: number): void {
  if (!state.countdownElement) {
    return;
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  state.countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Handles the continue button click
 */
function handleContinue(): void {
  // Make a lightweight request to server to extend session
  fetch("/api/extend-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(() => {
      resetTimers();
    })
    .catch((error) => {
      console.error("Failed to extend session:", error);
      logout();
    });
}

/**
 * Logs out the user
 */
function logout(): void {
  const locale = getCurrentLocale();
  const redirectUrl = locale === "cy" ? "/session-expired?lng=cy" : "/session-expired";
  window.location.href = redirectUrl;
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSessionTimeout);
} else {
  initSessionTimeout();
}
