import type { BrowserContext, Page, Request, Response } from "playwright";

// When a page is ready to read: its load event, then until the page's own fetch and XHR requests
// have been quiet for QUIET_MS (CaTH's court search builds its autocomplete from a fetch it makes
// after load). Playwright's networkidle instead waits for 500 ms with nothing on the network after
// every navigation, which was a quarter of each capture and most of a journey step. A context must
// be tracked from before its first page loads, so its requests are seen; an untracked one is waited
// for with networkidle, as before.
const QUIET_MS = 100;
const TIMEOUT_MS = 10_000;
const POLL_MS = 20;
const SCRIPT_REQUESTS = new Set(["fetch", "xhr"]);
const trackers = new WeakMap<BrowserContext, Tracker>();

export function trackRequests(context: BrowserContext): void {
  const tracker: Tracker = { inFlight: new Set(), lastActivity: 0 };
  const started = (request: Request) => {
    if (!SCRIPT_REQUESTS.has(request.resourceType())) return;
    tracker.inFlight.add(request);
    tracker.lastActivity = Date.now();
  };
  const ended = (request: Request) => {
    if (tracker.inFlight.delete(request)) tracker.lastActivity = Date.now();
  };
  context.on("request", started);
  context.on("requestfinished", ended);
  context.on("requestfailed", ended);
  trackers.set(context, tracker);
}

export async function settle(page: Page): Promise<void> {
  const tracker = trackers.get(page.context());
  if (!tracker) return page.waitForLoadState("networkidle");
  await page.waitForLoadState("load");
  // Quiet is counted from load too, so a fetch a load handler starts is not missed
  const loadedAt = Date.now();
  const deadline = loadedAt + TIMEOUT_MS;
  const quiet = () => tracker.inFlight.size === 0 && Date.now() - Math.max(tracker.lastActivity, loadedAt) >= QUIET_MS;
  while (!quiet() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, POLL_MS));
}

// page.goto, ready to read when it returns
export async function gotoSettled(page: Page, url: string): Promise<Response | null> {
  const response = await page.goto(url, { waitUntil: "load" });
  await settle(page);
  return response;
}

interface Tracker {
  inFlight: Set<Request>;
  lastActivity: number;
}
