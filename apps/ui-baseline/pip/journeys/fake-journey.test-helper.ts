import type { Page } from "playwright";
import { vi } from "vitest";
import type { CathJourneyData } from "../../cath/journeys/index.js";
import type { RecordStore } from "../../cath/records.js";
import type { JourneyContext } from "../../core/index.js";
import type { SeedResult } from "../../fixtures/manifest.js";

// A recording stand-in for Playwright's Page, enough to run pip's and CaTH's journeys without a
// browser. Imported only by tests. Every locator action is recorded with the locator's selector chain.
export interface FakePageOptions {
  // What page.url() returns; a function to change it as the journey goes
  url?: string | (() => string);
  // count() and all() by the locator's own selector (ignoring parents and filters); 1 when absent
  counts?: Record<string, number>;
  // What isVisible() gives, or the error it rejects with
  visible?: boolean | Error;
  // getAttribute() by attribute name
  attributes?: Record<string, string>;
  // An action on a locator whose selector chain includes this text throws, as a missing element would
  failOn?: string;
}

export interface PageAction {
  selector: string;
  action: string;
  args: unknown[];
}

type Filter = { has?: { selector: string }; hasText?: string | RegExp };

export function fakePage(options: FakePageOptions = {}) {
  const actions: PageAction[] = [];
  const countOf = (own: string) => options.counts?.[own] ?? 1;
  const record = async (selector: string, action: string, args: unknown[]) => {
    actions.push({ selector, action, args });
    if (options.failOn && selector.includes(options.failOn)) throw new Error(`no element for ${selector}`);
  };

  const locator = (selector: string, own: string): Record<string, unknown> => {
    const act =
      (action: string) =>
      (...args: unknown[]) =>
        record(selector, action, args);
    return {
      selector,
      locator: (child: string) => locator(`${selector} >> ${child}`, child),
      filter: ({ has, hasText }: Filter) => locator(`${selector} >> filter(${has ? `has=${has.selector}` : `hasText=${String(hasText)}`})`, own),
      first: () => locator(`${selector} >> first`, own),
      last: () => locator(`${selector} >> last`, own),
      all: async () => Array.from({ length: countOf(own) }, (_, i) => locator(`${selector} >> nth=${i}`, own)),
      count: async () => countOf(own),
      isVisible: async () => {
        if (options.visible instanceof Error) throw options.visible;
        return options.visible ?? true;
      },
      getAttribute: async (name: string) => options.attributes?.[name] ?? null,
      check: act("check"),
      uncheck: act("uncheck"),
      click: act("click"),
      fill: act("fill"),
      selectOption: act("selectOption"),
      setInputFiles: act("setInputFiles")
    };
  };

  const page = {
    locator: (selector: string) => locator(selector, selector),
    goto: (url: string, gotoOptions?: unknown) => record("page", "goto", [url, gotoOptions]),
    waitForLoadState: (state: string) => record("page", "waitForLoadState", [state]),
    // An untracked context, so settle() waits as networkidle and the wait is recorded
    context: () => ({}),
    url: () => (typeof options.url === "function" ? options.url() : (options.url ?? "http://localhost:8080/journey"))
  };

  // Each action's selector and arguments, for asserting what a journey did
  const did = (action: string) => actions.filter((entry) => entry.action === action);
  return { page: page as unknown as Page, actions, did };
}

// A JourneyContext that records the journey's navigation, actions and checkpoints in order
export function fakeContext(page: Page, locale: string, data: Record<string, unknown>) {
  const checkpoints: { name: string; note?: string }[] = [];
  const acts: string[] = [];
  const gotos: string[] = [];
  const context: JourneyContext = {
    page,
    locale,
    data,
    goto: async (path) => {
      gotos.push(path);
    },
    act: async (description, action) => {
      acts.push(description);
      await action();
    },
    checkpoint: async (name, note) => {
      checkpoints.push(note === undefined ? { name } : { name, note });
    }
  };
  return { context, checkpoints, acts, gotos, names: () => checkpoints.map((checkpoint) => checkpoint.name) };
}

export const SEEDED_PUBLICATION = { artefactId: "artefact-123", locationId: 1 };

export function seedResult(): SeedResult {
  return {
    app: "test",
    seededAt: "2026-01-01T00:00:00Z",
    ingestion: "api",
    publications: {
      "civil-and-family-daily-cause-list": {
        ...SEEDED_PUBLICATION,
        metadata: {
          contentDate: "2026-01-01",
          displayFrom: "2026-01-01",
          displayTo: "2026-01-02",
          type: "LIST",
          language: "ENGLISH",
          sensitivity: "PUBLIC",
          provenance: "MANUAL_UPLOAD"
        }
      }
    },
    rejected: {}
  };
}

export function fakeRecordStore() {
  return {
    ensureSubscription: vi.fn(async () => "subscription-1"),
    ensureMediaApplication: vi.fn(async (application: { email: string }) => `application-${application.email}`),
    ensureLegacyThirdPartyUser: vi.fn(async () => "legacy-1"),
    ensureThirdPartySubscriber: vi.fn(async () => "subscriber-1"),
    ensureAuditEntry: vi.fn(async () => ({ id: "audit-1", timestamp: "2026-01-01T00:00:00Z" })),
    createPublication: vi.fn(async () => "publication-1"),
    removeMediaApplication: vi.fn(async () => {}),
    ensureUser: vi.fn(async () => "user-42"),
    removeLegacyThirdPartyUsers: vi.fn(async () => {}),
    removeThirdPartySubscribers: vi.fn(async () => {}),
    replaceListSearchConfig: vi.fn(async () => ({ caseNumberFieldName: "previousNumber", caseNameFieldName: "previousName" })),
    indexPublicationCases: vi.fn(async () => [{ caseNumber: "1", caseName: "previous" }]),
    restorePublicationCases: vi.fn(async () => {})
  } satisfies RecordStore;
}

export const CATH_LIST_TYPES: Record<string, string> = {
  CIVIL_AND_FAMILY_DAILY_CAUSE_LIST: "8",
  CIVIL_DAILY_CAUSE_LIST: "1",
  FAMILY_DAILY_CAUSE_LIST: "2"
};

export function cathData(overrides: Partial<CathJourneyData> = {}) {
  const records = fakeRecordStore();
  const data: CathJourneyData = {
    listTypes: { ...CATH_LIST_TYPES },
    seed: seedResult(),
    users: { "journey-subscriber": "cath-subscriber-id" },
    seededRecords: {},
    records,
    apiUrl: "http://localhost:3001",
    ...overrides
  };
  return { data: data as unknown as Record<string, unknown>, records };
}

// Stands in for pip's account-management and data-management APIs, which some pip journeys call
// to make their own data. Each response can be overridden by "METHOD path" (path without host).
export function stubPipApis(overrides: Record<string, () => Response> = {}) {
  const calls: { method: string; url: string; init?: RequestInit }[] = [];
  const json = (body: unknown) => () => new Response(JSON.stringify(body), { status: 200 });
  const routes: Record<string, () => Response> = {
    "GET /account/provenance/PI_AAD/00000000-0000-4000-8000-0000000000d1": json({ userId: "subscriber-1" }),
    "POST /subscription": json({}),
    "POST /publication": json({}),
    "GET /account/provenance/CFT_IDAM/parity-delete-en": json({ userId: "delete-en" }),
    "GET /account/provenance/CFT_IDAM/parity-delete-cy": json({ userId: "delete-cy" }),
    "POST /account/add/pi": json({}),
    "GET /application/status/PENDING": json([]),
    "POST /application": json({ id: "application-new" }),
    ...overrides
  };
  const fetch = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push({ method, url: url.pathname, init });
    const route = routes[`${method} ${url.pathname}`];
    if (!route) throw new Error(`unexpected ${method} ${url.pathname}`);
    return route();
  });
  vi.stubGlobal("fetch", fetch);
  return { fetch, calls };
}
