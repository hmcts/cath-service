import { describe, expect, it } from "vitest";
import * as webCore from "./index.js";

describe("Web Core Module Exports", () => {
  it("should export locale functions and data", () => {
    expect(webCore.cy).toBeDefined();
    expect(webCore.en).toBeDefined();
  });

  it("should export cookie manager", () => {
    expect(webCore.configureCookieManager).toBeDefined();
    expect(typeof webCore.configureCookieManager).toBe("function");
  });

  it("should export file upload", () => {
    expect(webCore.createFileUpload).toBeDefined();
    expect(typeof webCore.createFileUpload).toBe("function");
  });

  it("should export GovUK configuration", () => {
    expect(webCore.configureGovuk).toBeDefined();
    expect(typeof webCore.configureGovuk).toBe("function");
  });

  it("should export error handlers", () => {
    expect(webCore.errorHandler).toBeDefined();
    expect(webCore.notFoundHandler).toBeDefined();
    expect(typeof webCore.errorHandler).toBe("function");
    expect(typeof webCore.notFoundHandler).toBe("function");
  });

  it("should export helmet configuration", () => {
    expect(webCore.configureHelmet).toBeDefined();
    expect(webCore.configureNonce).toBeDefined();
    expect(typeof webCore.configureHelmet).toBe("function");
    expect(typeof webCore.configureNonce).toBe("function");
  });

  it("should export i18n middleware", () => {
    expect(webCore.localeMiddleware).toBeDefined();
    expect(webCore.translationMiddleware).toBeDefined();
    expect(typeof webCore.localeMiddleware).toBe("function");
    expect(typeof webCore.translationMiddleware).toBe("function");
  });

  it("should export translation functions", () => {
    expect(webCore.getTranslation).toBeDefined();
    expect(webCore.loadTranslations).toBeDefined();
    expect(typeof webCore.getTranslation).toBe("function");
    expect(typeof webCore.loadTranslations).toBe("function");
  });

  it("should export session store functions", () => {
    expect(webCore.expressSessionPostgres).toBeDefined();
    expect(webCore.PostgresStore).toBeDefined();
    expect(webCore.expressSessionRedis).toBeDefined();
    expect(typeof webCore.expressSessionPostgres).toBe("function");
    expect(typeof webCore.expressSessionRedis).toBe("function");
  });

  it("should export date utilities", () => {
    expect(webCore.formatDateAndLocale).toBeDefined();
    expect(webCore.parseDate).toBeDefined();
    expect(typeof webCore.formatDateAndLocale).toBe("function");
    expect(typeof webCore.parseDate).toBe("function");
  });

  it("should export vite config", () => {
    expect(webCore.createBaseViteConfig).toBeDefined();
    expect(typeof webCore.createBaseViteConfig).toBe("function");
  });
});
