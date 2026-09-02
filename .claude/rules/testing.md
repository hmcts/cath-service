# Testing Strategy

- **Unit/Integration Tests**: Vitest, co-located with source (`*.test.ts`)
- **Template Tests**: Vitest with `@hmcts/test-support` render helpers (`*.njk.test.ts`)
- **E2E Tests**: Playwright in `e2e-tests/`
- **Accessibility Tests**: Axe-core with Playwright
- **Test Scripts**: All packages must use `"test": "vitest run"`
- **Coverage**: Aim for >80% on business logic

## Arrange-Act-Assert Pattern

All tests must follow the AAA pattern for clarity and consistency:

1. **Arrange**: Set up test data, mocks, and preconditions
2. **Act**: Execute the code under test
3. **Assert**: Verify the expected outcome

## Unit Test File Pattern

```typescript
// user-service.test.ts (co-located with user-service.ts)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@hmcts/postgres-prisma";
import { findUserById, createUser } from "./user-service.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}));

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findUserById", () => {
    it("should return user when found", async () => {
      // Arrange
      const mockUser = { id: "123", email: "test@example.com", name: "Test User" };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      // Act
      const result = await findUserById("123");

      // Assert
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "123" } });
    });

    it("should return null when user not found", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Act
      const result = await findUserById("nonexistent");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("createUser", () => {
    it("should create and return new user", async () => {
      // Arrange
      const userData = { email: "new@example.com", name: "New User" };
      const createdUser = { id: "456", ...userData };
      vi.mocked(prisma.user.create).mockResolvedValue(createdUser);

      // Act
      const result = await createUser(userData);

      // Assert
      expect(result).toEqual(createdUser);
      expect(prisma.user.create).toHaveBeenCalledWith({ data: userData });
    });
  });
});
```

## Testing Page Controllers

```typescript
// my-page.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { GET, POST } from "./my-page.js";

describe("my-page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      query: {},
      body: {},
      session: {} as any
    };
    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should render the page with translations", async () => {
      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "my-page",
        expect.objectContaining({
          en: expect.any(Object),
          cy: expect.any(Object),
          t: expect.any(Object)
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect on successful submission", async () => {
      // Arrange
      mockRequest.body = { email: "test@example.com" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/success");
    });

    it("should re-render with errors on validation failure", async () => {
      // Arrange
      mockRequest.body = { email: "" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "my-page",
        expect.objectContaining({
          errors: expect.any(Array),
          data: mockRequest.body
        })
      );
    });
  });
});
```

## Testing Middleware Arrays

When controllers export middleware arrays:

```typescript
import { GET } from "./protected-page.js";

describe("protected-page", () => {
  it("should render page for authorized users", async () => {
    // Get the actual handler (last item in array)
    const handler = GET[GET.length - 1];

    // Act
    await handler(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockResponse.render).toHaveBeenCalled();
  });
});
```

## Test Naming Conventions

- Use descriptive names that explain the behavior being tested
- Format: `should [expected behavior] when [condition]`
- Group related tests with nested `describe` blocks

```typescript
describe("UserService", () => {
  describe("findUserById", () => {
    it("should return user when found", async () => { });
    it("should return null when user not found", async () => { });
  });

  describe("createUser", () => {
    it("should create and return new user", async () => { });
    it("should throw error when email already exists", async () => { });
  });
});
```

## Mocking Patterns

### Mock External Modules

```typescript
vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}));
```

### Mock Internal Dependencies

```typescript
vi.mock("./user-service.js", () => ({
  findUserById: vi.fn(),
  createUser: vi.fn()
}));
```

### Reset Mocks Between Tests

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Nunjucks Template Testing

Test `.njk` templates by rendering them to HTML and asserting on **structure** with
Cheerio — not by matching raw HTML strings. Use the shared helpers from
`@hmcts/test-support`; never call `nunjucks.configure()` in a test.

### Why the shared helper

`createTestEnvironment` builds an **isolated** Nunjucks environment per test file.
`nunjucks.configure()` mutates a single global environment, so concurrent test
files clobber each other's template search paths — flaky, order-dependent failures.

```typescript
import { createTestEnvironment, render, assertErrorSummary, assertNoErrors } from "@hmcts/test-support";
```

- `createTestEnvironment(modulePaths, options?)` — isolated env; pass the template
  dirs it needs (the test's own dir, plus any shared view dirs like
  `libs/web-core/src/views`). GOV.UK Frontend is wired in for you.
- `render(env, template, data)` — returns `{ html, $ }` where `$` is a Cheerio
  instance for structural queries.
- `assertNoErrors($)` / `assertErrorSummary($, messages)` — assert the GOV.UK
  error summary is absent / contains the given messages.

### Rules

- **Assert on structure, not strings.** Query DOM (`$("#page-heading")`,
  `$("td[colspan]")`, `$(".govuk-accordion__section")`) and assert text/attrs/counts.
  Do not assert against slices of the raw HTML.
- **Use `toHaveLength`**, not `.length` comparisons (`expect($(sel)).toHaveLength(1)`).
- **No AAA comments** in template tests — the `describe`/`it` names carry intent.
- **Layered fixture builders.** For deeply nested data (e.g.
  `courtLists → courtHouse → courtRoom → session → sitting → hearing → case`),
  write small `buildX()` helpers that each default to a realistic minimal shape and
  accept overrides. Individual tests pass only the leaf field they vary.
- **Column-index constants** for table assertions — name the columns
  (`const COLUMN = { time: 0, caseRef: 1, ... }`) and index cells by name.
- **Assert conditional rendering both ways** — present *and* absent (e.g. the
  listing-notes column only when `hasListingNotes`, `colspan` 6 vs 5).
- **Cover Welsh** by rendering with the `cy` locale object and asserting the
  translated headings/labels appear.
- **Check locale-key parity**: `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())`.

### Pattern

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
import { myListCy as cy, myListEn as en } from "@hmcts/my-list-type";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "my-list.njk";

// Layered builders — deep tree stays out of individual tests.
function buildCase(overrides = {}) {
  return { caseNumber: "T123", defendants: "Defendant A", ...overrides };
}
function baseData(locale: typeof en | typeof cy = en) {
  return { t: locale, en, cy, header: { locationName: "Test Court" } };
}
function renderList(courtLists: unknown[], overrides = {}, locale = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, listData: { courtLists } });
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("my-list template", () => {
  it("should render the heading with the page title", () => {
    const { $ } = renderList([]);
    expect($("h1#page-heading").text()).toContain(en.pageTitle);
  });

  it("should render Welsh headings when the cy locale is used", () => {
    const { $ } = renderList([], {}, cy);
    expect($("h1#page-heading").text()).toContain(cy.pageTitle);
  });
});
```

See `apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk.test.ts`
for the reference implementation, and `libs/test-support/src/nunjucks-test-helper.ts`
for the helpers.

## E2E Testing

E2E tests live in `e2e-tests/tests/` and use Playwright.

Write E2E tests when adding a new page or user journey. Test the happy path and include accessibility checks inline.

For detailed E2E testing patterns and guidelines, see `.claude/rules/e2e-testing.md`.

## Running Tests

```bash
yarn test              # Run all unit tests
yarn test:coverage     # Run tests with coverage report
yarn test:e2e          # Run E2E tests (excludes @nightly)
yarn test:e2e:all      # Run all E2E tests (including @nightly)
```
