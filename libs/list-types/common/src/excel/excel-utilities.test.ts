import { describe, expect, it } from "vitest";
import { sanitiseCellValue } from "./excel-utilities.js";

describe("sanitiseCellValue", () => {
  it("should prefix a value starting with '=' with a single quote", () => {
    expect(sanitiseCellValue("=SUM(A1)")).toBe("'=SUM(A1)");
  });

  it("should prefix a value starting with '+' with a single quote", () => {
    expect(sanitiseCellValue("+123")).toBe("'+123");
  });

  it("should prefix a value starting with '-' with a single quote", () => {
    expect(sanitiseCellValue("-456")).toBe("'-456");
  });

  it("should prefix a value starting with '@' with a single quote", () => {
    expect(sanitiseCellValue("@user")).toBe("'@user");
  });

  it("should not modify values that do not start with injection characters", () => {
    expect(sanitiseCellValue("John Smith")).toBe("John Smith");
  });

  it("should not modify an empty string", () => {
    expect(sanitiseCellValue("")).toBe("");
  });

  it("should not modify values starting with numbers", () => {
    expect(sanitiseCellValue("123")).toBe("123");
  });

  it("should not modify values starting with letters", () => {
    expect(sanitiseCellValue("ABCxyz")).toBe("ABCxyz");
  });
});
