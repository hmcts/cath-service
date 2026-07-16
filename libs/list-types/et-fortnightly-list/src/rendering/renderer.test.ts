import { renderCauseListData as sharedRenderCauseListData } from "@hmcts/daily-cause-list-common";
import { describe, expect, it } from "vitest";
import { renderCauseListData } from "./renderer.js";

describe("renderer re-export", () => {
  it("should re-export renderCauseListData from the shared common package", () => {
    // Assert
    expect(renderCauseListData).toBe(sharedRenderCauseListData);
    expect(typeof renderCauseListData).toBe("function");
  });
});
