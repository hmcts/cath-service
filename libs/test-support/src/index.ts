// Test support module - provides API endpoints for E2E test data management
// These endpoints are only available in non-production environments

export type { RenderResult } from "./nunjucks-test-helper.js";

// Nunjucks test helpers for unit testing templates
export {
  createTestEnvironment,
  render
} from "./nunjucks-test-helper.js";
export type { CreateArtefactInput, CreateLocationInput, CreateSubscriptionInput, CreateUserInput } from "./types.js";
