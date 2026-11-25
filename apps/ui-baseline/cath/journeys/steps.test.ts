import { describe, expect, it } from "vitest";
import { fakePage } from "../../pip/journeys/fake-journey.test-helper.js";
import { chooseCourt, courtNames, inlineAction, link, primaryButton, unsubscribeFromEverything } from "./steps.js";

const PRIMARY = "main form button.govuk-button, main form input[type=submit].govuk-button >> last";
const COURT = { name: "Manchester Civil Justice Centre", welshName: "Canolfan Cyfiawnder Sifil Manceinion" };

describe("CaTH journey steps", () => {
  describe("primaryButton", () => {
    it("should pick the last GOV.UK button in the page's forms when the page has inline forms too", async () => {
      // Arrange
      const { page, actions } = fakePage();

      // Act
      await primaryButton(page).click();

      // Assert
      expect(actions[0].selector).toBe(PRIMARY);
    });
  });

  describe("inlineAction", () => {
    it("should pick the button of the form posting the action when no location is given", async () => {
      // Arrange
      const { page, actions } = fakePage();

      // Act
      await inlineAction(page, "change-version").click();

      // Assert
      expect(actions[0].selector).toBe('main form >> filter(has=input[name=action][value="change-version"]) >> button >> first');
    });

    it("should narrow to the form for that location when a location is given", async () => {
      // Arrange
      const { page, actions } = fakePage();

      // Act
      await inlineAction(page, "remove", "2").click();

      // Assert
      expect(actions[0].selector).toBe(
        'main form >> filter(has=input[name=action][value="remove"]) >> filter(has=input[name=locationId][value="2"]) >> button >> first'
      );
    });
  });

  describe("link", () => {
    it("should match the href with or without a query inside main", async () => {
      // Arrange
      const { page, actions } = fakePage();

      // Act
      await link(page, "/find-users").click();

      // Assert
      expect(actions[0].selector).toBe('main a[href="/find-users"], main a[href^="/find-users?"] >> first');
    });
  });

  describe("unsubscribeFromEverything", () => {
    it("should stop after opening bulk unsubscribe when the user has no subscriptions", async () => {
      // Arrange
      const { page, actions } = fakePage({ counts: { "#all-subscriptions input[name=subscriptions]": 0 } });

      // Act
      await unsubscribeFromEverything(page, "https://cath.test");

      // Assert
      expect(actions).toEqual([
        { selector: "page", action: "goto", args: ["https://cath.test/bulk-unsubscribe", { waitUntil: "load" }] },
        { selector: "page", action: "waitForLoadState", args: ["networkidle"] }
      ]);
    });

    it("should tick every subscription, continue and confirm when the user has subscriptions", async () => {
      // Arrange
      const { page, did } = fakePage({ counts: { "#all-subscriptions input[name=subscriptions]": 3 } });

      // Act
      await unsubscribeFromEverything(page, "https://cath.test");

      // Assert
      expect(did("check").map((entry) => entry.selector)).toEqual([
        "#all-subscriptions input[name=subscriptions] >> nth=0",
        "#all-subscriptions input[name=subscriptions] >> nth=1",
        "#all-subscriptions input[name=subscriptions] >> nth=2",
        'input[name="confirm"][value="yes"]'
      ]);
      expect(did("click").map((entry) => entry.selector)).toEqual([PRIMARY, PRIMARY]);
      expect(did("waitForLoadState")).toHaveLength(3);
    });
  });

  describe("courtNames", () => {
    it("should give both names from location-data.ts when the location exists", () => {
      // Act
      const names = courtNames(3);

      // Assert
      expect(names).toEqual(COURT);
    });

    it("should throw when the location is not in location-data.ts", () => {
      // Act & Assert
      expect(() => courtNames(-1)).toThrow("location -1 is not in location-data.ts");
    });
  });

  describe("chooseCourt", () => {
    it("should type and pick the Welsh name when the input asks for Welsh", async () => {
      // Arrange
      const { page, actions } = fakePage({ attributes: { "data-locale": "cy" } });

      // Act
      await chooseCourt(page, "court-search", COURT);

      // Assert
      expect(actions).toEqual([
        { selector: "#court-search-autocomplete-wrapper input#court-search", action: "fill", args: [COURT.welshName] },
        { selector: `#court-search__listbox li[role=option] >> filter(hasText=${COURT.welshName}) >> first`, action: "click", args: [] }
      ]);
    });

    it("should type the English name when the input asks for English, whatever the page's language", async () => {
      // Arrange
      const { page, did } = fakePage({ attributes: { "data-locale": "en" } });

      // Act
      await chooseCourt(page, "court", COURT);

      // Assert
      expect(did("fill")[0].args).toEqual([COURT.name]);
    });

    it("should type the English name when the input has no data-locale", async () => {
      // Arrange
      const { page, did } = fakePage();

      // Act
      await chooseCourt(page, "locationId", COURT);

      // Assert
      expect(did("fill")[0].args).toEqual([COURT.name]);
    });
  });
});
