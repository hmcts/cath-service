import { describe, expect, it } from "vitest";
import { listTypeData } from "./list-type-data.js";

const ET_LIST_TYPES = [
  {
    name: "ET_DAILY_LIST",
    englishFriendlyName: "Employment Tribunals Daily List",
    welshFriendlyName: "Rhestr Ddyddiol y Tribiwnlysoedd Cyflogaeth",
    shortenedFriendlyName: "ET Daily List",
    urlPath: "et-daily-list"
  },
  {
    name: "ET_FORTNIGHTLY_PRESS_LIST",
    englishFriendlyName: "Employment Tribunals Fortnightly Press List",
    welshFriendlyName: "Rhestr y Wasg Pob Pythefnos y Tribiwnlysoedd Cyflogaeth",
    shortenedFriendlyName: "ET Fortnightly List",
    urlPath: "et-fortnightly-list"
  }
];

describe.each(ET_LIST_TYPES)("listTypeData Employment Tribunal list $name", (listType) => {
  it("should have exactly one entry", () => {
    const entries = listTypeData.filter((entry) => entry.name === listType.name);
    expect(entries).toHaveLength(1);
  });

  it("should be strategic (isNonStrategic === false)", () => {
    const entry = listTypeData.find((item) => item.name === listType.name);
    expect(entry?.isNonStrategic).toBe(false);
  });

  it("should have provenance CFT_IDAM and Public default sensitivity", () => {
    const entry = listTypeData.find((item) => item.name === listType.name);
    expect(entry?.provenance).toBe("CFT_IDAM");
    expect(entry?.defaultSensitivity).toBe("Public");
  });

  it("should be linked to the Employment Tribunal sub-jurisdiction (id 3)", () => {
    const entry = listTypeData.find((item) => item.name === listType.name);
    expect(entry?.subJurisdictionIds).toEqual([3]);
  });

  it("should use the listLookup.json friendly names and url path", () => {
    const entry = listTypeData.find((item) => item.name === listType.name);
    expect(entry?.englishFriendlyName).toBe(listType.englishFriendlyName);
    expect(entry?.welshFriendlyName).toBe(listType.welshFriendlyName);
    expect(entry?.shortenedFriendlyName).toBe(listType.shortenedFriendlyName);
    expect(entry?.urlPath).toBe(listType.urlPath);
  });
});
