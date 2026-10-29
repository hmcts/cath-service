import type { Page } from "playwright";

// A journey is a scripted user flow. It drives the page with the helpers below and calls
// checkpoint() at every page worth comparing; the runner captures each checkpoint like a page
// and records the action that led to it, so step order and transitions can be compared too.
export interface Journey {
  id: string;
  description: string;
  // Project-defined user to sign in as before the journey starts; absent for signed-out journeys
  viewAs?: string;
  run: (context: JourneyContext) => Promise<void>;
}

export interface JourneyContext {
  page: Page;
  locale: string;
  // Navigates to a path on the app under test, keeping the journey's locale
  goto: (path: string) => Promise<void>;
  // Performs an action and records its description as the transition into the next checkpoint
  act: (description: string, action: () => Promise<unknown>) => Promise<void>;
  // note: how the step was reached when it is not by the app's own flow, recorded with the step
  checkpoint: (name: string, note?: string) => Promise<void>;
  // Project data: seed results, fixture files and the like, passed through untouched
  data: Record<string, unknown>;
}

// What a project's journeys module exports for the runner
export interface JourneySuite {
  app: string;
  baseUrl: string;
  cookies?: { name: string; value: string }[];
  // Signs the given user in on this page's browser context
  signIn?: (page: Page, userId: string) => Promise<void>;
  data?: Record<string, unknown>;
  journeys: Journey[];
}
