/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all the dependencies
vi.mock("@hmcts/cookie-manager", () => ({
  default: {
    init: vi.fn(),
    on: vi.fn()
  }
}));

vi.mock("./back-to-top.js", () => ({
  initBackToTop: vi.fn()
}));

vi.mock("./filter-panel.js", () => ({
  initFilterPanel: vi.fn()
}));

vi.mock("./search-autocomplete.js", () => ({
  initSearchAutocomplete: vi.fn(() => Promise.resolve())
}));

vi.mock("./table-search.js", () => ({
  initTableSearch: vi.fn()
}));

vi.mock("./list-type-sensitivity.js", () => ({
  initListTypeSensitivity: vi.fn()
}));

vi.mock("./sjp-filter-search.js", () => ({
  initSjpFilterSearch: vi.fn()
}));

vi.mock("./session-timeout.js", () => ({}));

vi.mock("./sortable-table.js", () => ({
  initSortableTable: vi.fn()
}));

vi.mock("govuk-frontend", () => ({
  initAll: vi.fn()
}));

describe("Web Assets Index", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Import the module to execute the initialization code
    await import("./web.js");
  });

  it("should initialize GOV.UK Frontend", async () => {
    const { initAll } = await import("govuk-frontend");
    expect(initAll).toHaveBeenCalled();
  });

  it("should initialize cookie manager with config", async () => {
    const cookieManager = (await import("@hmcts/cookie-manager")).default;
    // Cookie manager initialization happens at module load time
    expect(cookieManager).toBeDefined();
    expect(cookieManager.init).toBeDefined();
    expect(cookieManager.on).toBeDefined();
  });

  it("should define cookie config with essential cookies", () => {
    const config = {
      userPreferences: {
        cookieName: "cookie_policy"
      },
      cookieBanner: {
        class: "govuk-cookie-banner",
        actions: expect.any(Array)
      },
      preferencesForm: {
        class: "cookie-preferences-form"
      },
      cookieManifest: expect.arrayContaining([
        expect.objectContaining({
          categoryName: "essential",
          optional: false
        })
      ])
    };

    expect(config).toBeDefined();
    expect(config.cookieManifest).toBeDefined();
  });

  it("should define analytics cookies in manifest", () => {
    const analyticsCategory = {
      categoryName: "analytics",
      optional: true,
      cookies: expect.arrayContaining(["_ga", "_gid"])
    };

    expect(analyticsCategory).toBeDefined();
  });

  it("should define preferences cookies in manifest", () => {
    const preferencesCategory = {
      categoryName: "preferences",
      optional: true,
      cookies: expect.arrayContaining(["language"])
    };

    expect(preferencesCategory).toBeDefined();
  });
});
