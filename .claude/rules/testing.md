# Testing Strategy

- **Unit/Integration Tests**: Vitest, co-located with source (`*.test.ts`)
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
