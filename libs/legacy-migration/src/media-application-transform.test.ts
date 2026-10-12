import { describe, expect, it } from "vitest";
import type { LegacyMediaApplication } from "./legacy-account-source.js";
import { transformMediaApplications } from "./media-application-transform.js";

const APPLICATION_ID = "44444444-4444-4444-4444-444444444444";

function buildLegacyApplication(overrides: Partial<LegacyMediaApplication> = {}): LegacyMediaApplication {
  return {
    id: APPLICATION_ID,
    full_name: " Jo Bloggs ",
    email: "Jo@Example.com",
    employer: "News Ltd",
    image: "legacy-image-uuid",
    image_name: "Press Card.PNG",
    request_date: new Date("2025-01-01T09:00:00Z"),
    ...overrides
  };
}

describe("transformMediaApplications", () => {
  it("should keep the legacy id and name the proof of ID the way the new upload does", () => {
    // Act
    const result = transformMediaApplications([buildLegacyApplication()]);

    // Assert
    expect(result.rows).toEqual([
      {
        application: {
          id: APPLICATION_ID,
          name: "Jo Bloggs",
          email: "jo@example.com",
          employer: "News Ltd",
          proofOfIdPath: `${APPLICATION_ID}.png`,
          proofOfIdOriginalName: "Press Card.PNG",
          status: "PENDING",
          appliedDate: new Date("2025-01-01T09:00:00Z")
        },
        proofOfIdSourceBlob: "legacy-image-uuid"
      }
    ]);
  });

  it("should reject applications missing a required field or proof of ID", () => {
    // Arrange
    const legacy = [
      buildLegacyApplication({ id: "no-email", email: null }),
      buildLegacyApplication({ id: "no-employer", employer: " " }),
      buildLegacyApplication({ id: "no-image", image: null })
    ];

    // Act
    const result = transformMediaApplications(legacy);

    // Assert
    expect(result.rows).toHaveLength(0);
    expect(result.rejections).toEqual([
      { entityId: "no-email", reason: "missing name, email or employer" },
      { entityId: "no-employer", reason: "missing name, email or employer" },
      { entityId: "no-image", reason: "missing proof of ID" }
    ]);
  });

  it("should reject proof of ID types the new upload does not accept", () => {
    // Act
    const result = transformMediaApplications([buildLegacyApplication({ image_name: "card.gif" })]);

    // Assert
    expect(result.rejections).toEqual([{ entityId: APPLICATION_ID, reason: "unsupported proof of ID type .gif" }]);
  });
});
