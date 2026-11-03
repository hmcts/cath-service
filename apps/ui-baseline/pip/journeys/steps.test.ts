import { describe, expect, it } from "vitest";
import { fakePage } from "./fake-journey.test-helper.js";
import { chooseCourt, courtName, link, primaryButton, unsubscribeFromEverything } from "./steps.js";

const SUBMIT = "button[type=submit], input[type=submit]";

describe("pip journey steps", () => {
  describe("primaryButton", () => {
    it("should pick the submit button of the last form with one when the page has a filter form first", async () => {
      // Arrange
      const { page, actions } = fakePage();

      // Act
      await primaryButton(page).click();

      // Assert
      expect(actions).toEqual([{ selector: `main form >> filter(has=${SUBMIT}) >> last >> ${SUBMIT} >> first`, action: "click", args: [] }]);
    });
  });

  describe("link", () => {
    it("should match absolute and relative hrefs, with or without a query, when given an absolute href", async () => {
      // Arrange
      const { page, actions } = fakePage();

      // Act
      await link(page, "/subscription-add").click();

      // Assert
      expect(actions[0].selector).toBe(
        'a[href="/subscription-add"], a[href^="/subscription-add?"], a[href="subscription-add"], a[href^="subscription-add?"] >> first'
      );
    });
  });

  describe("unsubscribeFromEverything", () => {
    it("should stop after opening bulk unsubscribe when there is nothing to select", async () => {
      // Arrange
      const { page, actions } = fakePage({ counts: { "#select-all-cases, #select-all-locations": 0 } });

      // Act
      await unsubscribeFromEverything(page, "http://pip.test");

      // Assert
      expect(actions).toEqual([{ selector: "page", action: "goto", args: ["http://pip.test/bulk-unsubscribe", { waitUntil: "networkidle" }] }]);
    });

    it("should select every table, continue and answer yes when the user has subscriptions", async () => {
      // Arrange
      const { page, did } = fakePage({ counts: { "#select-all-cases, #select-all-locations": 2 } });

      // Act
      await unsubscribeFromEverything(page, "http://pip.test");

      // Assert
      expect(did("check").map((entry) => entry.selector)).toEqual([
        "#select-all-cases, #select-all-locations >> nth=0",
        "#select-all-cases, #select-all-locations >> nth=1",
        'input[name="bulk-unsubscribe-choice"] >> first'
      ]);
      expect(did("click").map((entry) => entry.selector)).toEqual([
        "#bulk-unsubscribe-button",
        `main form >> filter(has=${SUBMIT}) >> last >> ${SUBMIT} >> first`
      ]);
      expect(did("waitForLoadState")).toHaveLength(2);
    });
  });

  describe("courtName", () => {
    it("should give the English name when the locale is en", () => {
      // Act
      const name = courtName(3, "en");

      // Assert
      expect(name).toBe("Manchester Civil Justice Centre");
    });

    it("should give the Welsh name when the locale is cy", () => {
      // Act
      const name = courtName(3, "cy");

      // Assert
      expect(name).toBe("Canolfan Cyfiawnder Sifil Manceinion");
    });

    it("should throw when the location is not in location-data.ts", () => {
      // Act & Assert
      expect(() => courtName(-1, "en")).toThrow("location -1 is not in location-data.ts");
    });
  });

  describe("chooseCourt", () => {
    it("should type the name and click the matching suggestion when it appears", async () => {
      // Arrange
      const { page, actions } = fakePage({ visible: true });

      // Act
      await chooseCourt(page, "Oxford Combined Court Centre");

      // Assert
      expect(actions).toEqual([
        { selector: "#search-input", action: "fill", args: ["Oxford Combined Court Centre"] },
        { selector: "#search-input__listbox li[role=option] >> filter(hasText=Oxford Combined Court Centre) >> first", action: "click", args: [] }
      ]);
    });

    it("should only type the name when no suggestion appears", async () => {
      // Arrange
      const { page, did } = fakePage({ visible: false });

      // Act
      await chooseCourt(page, "Oxford Combined Court Centre");

      // Assert
      expect(did("fill")).toHaveLength(1);
      expect(did("click")).toHaveLength(0);
    });

    it("should only type the name when waiting for the suggestion fails", async () => {
      // Arrange
      const { page, did } = fakePage({ visible: new Error("timed out") });

      // Act
      await chooseCourt(page, "Oxford Combined Court Centre");

      // Assert
      expect(did("click")).toHaveLength(0);
    });
  });
});
