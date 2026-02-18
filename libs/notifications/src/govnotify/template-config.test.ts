import { describe, expect, it } from "vitest";
import { buildTemplateParameters, formatPublicationDate, getServiceUrl } from "./template-config.js";

describe("template-config", () => {
  describe("getServiceUrl", () => {
    it("should return service URL from environment or default", () => {
      const result = getServiceUrl();

      // Should return either the env var if set, or the default
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });

  describe("formatPublicationDate", () => {
    it("should format date correctly", () => {
      const date = new Date("2024-12-01T10:00:00Z");

      const result = formatPublicationDate(date);

      expect(result).toBe("1 December 2024");
    });

    it("should format date with double-digit day", () => {
      const date = new Date("2024-03-15T10:00:00Z");

      const result = formatPublicationDate(date);

      expect(result).toBe("15 March 2024");
    });

    it("should format date in January", () => {
      const date = new Date("2024-01-05T10:00:00Z");

      const result = formatPublicationDate(date);

      expect(result).toBe("5 January 2024");
    });

    it("should format date in December", () => {
      const date = new Date("2024-12-31T10:00:00Z");

      const result = formatPublicationDate(date);

      expect(result).toBe("31 December 2024");
    });

    it("should handle all months correctly", () => {
      const dates = [
        { date: new Date("2024-01-15"), expected: "15 January 2024" },
        { date: new Date("2024-02-15"), expected: "15 February 2024" },
        { date: new Date("2024-03-15"), expected: "15 March 2024" },
        { date: new Date("2024-04-15"), expected: "15 April 2024" },
        { date: new Date("2024-05-15"), expected: "15 May 2024" },
        { date: new Date("2024-06-15"), expected: "15 June 2024" },
        { date: new Date("2024-07-15"), expected: "15 July 2024" },
        { date: new Date("2024-08-15"), expected: "15 August 2024" },
        { date: new Date("2024-09-15"), expected: "15 September 2024" },
        { date: new Date("2024-10-15"), expected: "15 October 2024" },
        { date: new Date("2024-11-15"), expected: "15 November 2024" },
        { date: new Date("2024-12-15"), expected: "15 December 2024" }
      ];

      for (const { date, expected } of dates) {
        expect(formatPublicationDate(date)).toBe(expected);
      }
    });
  });

  describe("buildTemplateParameters", () => {
    it("should build template parameters with location subscription", () => {
      const params = {
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01T10:00:00Z"),
        locationName: "Birmingham Crown Court",
        hasLocationSubscription: true
      };

      const result = buildTemplateParameters(params);

      expect(result.ListType).toBe("Daily Cause List");
      expect(result.content_date).toBe("1 December 2024");
      expect(result.locations).toBe("Birmingham Crown Court");
      expect(result.display_locations).toBe("yes");
      expect(result.case).toBe("");
      expect(result.display_case).toBe("");
      expect(result.start_page_link).toBeTruthy();
      expect(result.subscription_page_link).toBeTruthy();
    });

    it("should build template parameters without location subscription", () => {
      const params = {
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01T10:00:00Z"),
        locationName: "Birmingham Crown Court",
        hasLocationSubscription: false
      };

      const result = buildTemplateParameters(params);

      expect(result.locations).toBe("");
      expect(result.display_locations).toBe("");
    });

    it("should build template parameters with case information", () => {
      const params = {
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01T10:00:00Z"),
        locationName: "Birmingham Crown Court",
        caseInfo: "CASE-123, CASE-456",
        hasLocationSubscription: false
      };

      const result = buildTemplateParameters(params);

      expect(result.case).toBe("CASE-123, CASE-456");
      expect(result.display_case).toBe("yes");
    });

    it("should build template parameters with both location and case information", () => {
      const params = {
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01T10:00:00Z"),
        locationName: "Birmingham Crown Court",
        caseInfo: "CASE-123",
        hasLocationSubscription: true
      };

      const result = buildTemplateParameters(params);

      expect(result.locations).toBe("Birmingham Crown Court");
      expect(result.case).toBe("CASE-123");
      expect(result.display_locations).toBe("yes");
      expect(result.display_case).toBe("yes");
    });

    it("should build template parameters without optional fields", () => {
      const params = {
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01T10:00:00Z"),
        locationName: "Birmingham Crown Court"
      };

      const result = buildTemplateParameters(params);

      expect(result.locations).toBe("");
      expect(result.case).toBe("");
      expect(result.display_locations).toBe("");
      expect(result.display_case).toBe("");
    });

    it("should handle empty case info string", () => {
      const params = {
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01T10:00:00Z"),
        locationName: "Birmingham Crown Court",
        caseInfo: ""
      };

      const result = buildTemplateParameters(params);

      expect(result.case).toBe("");
      expect(result.display_case).toBe("");
    });

    it("should handle undefined hasLocationSubscription as false", () => {
      const params = {
        userName: "John Doe",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01T10:00:00Z"),
        locationName: "Birmingham Crown Court",
        hasLocationSubscription: undefined
      };

      const result = buildTemplateParameters(params);

      expect(result.locations).toBe("");
      expect(result.display_locations).toBe("");
    });
  });
});
