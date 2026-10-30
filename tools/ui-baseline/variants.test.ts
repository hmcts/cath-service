import { describe, expect, it } from "vitest";
import type { ParityUser } from "./fixtures/manifest.js";
import { parseVariant, variantId, variantUsers, withMobile } from "./variants.js";

const user = (id: string, role: string, extra: Partial<ParityUser> = {}): ParityUser => ({
  id,
  role,
  provenance: role === "VERIFIED" ? "PI_AAD" : "SSO",
  provenanceUserId: id,
  email: `${id}@example.com`,
  forenames: id,
  surname: id,
  ...extra
});

const USERS = [
  user("verified-media", "VERIFIED"),
  user("verified-cft", "VERIFIED", { provenance: "CFT_IDAM" }),
  user("journey-subscriber", "VERIFIED", { journeysOnly: true }),
  user("system-admin", "SYSTEM_ADMIN"),
  user("super-admin-ctsc", "INTERNAL_SUPER_ADMIN_CTSC"),
  user("admin-ctsc", "INTERNAL_ADMIN_CTSC"),
  user("admin-local", "INTERNAL_ADMIN_LOCAL")
];

describe("variantUsers", () => {
  it("should be every other user with a role the guard lets in", () => {
    // Act
    const users = variantUsers("isPermittedMediaAccount", "super-admin-ctsc", USERS);

    // Assert
    expect(users.map((u) => u.id)).toEqual(["admin-ctsc"]);
  });

  it("should leave out the user the page is already captured as, and journey-only users", () => {
    // Act
    const users = variantUsers("isPermittedMedia", "verified-media", USERS);

    // Assert
    expect(users.map((u) => u.id)).toEqual(["verified-cft"]);
  });

  it("should have no variants for a guard only one role passes, or none", () => {
    // Act and assert
    expect(variantUsers("isPermittedSystemAdmin", "system-admin", USERS)).toEqual([]);
    expect(variantUsers(null, null, USERS)).toEqual([]);
    expect(variantUsers("isSomethingNew", null, USERS)).toEqual([]);
  });
});

describe("parseVariant", () => {
  it("should split a variant id into its page and user, and leave a main id whole", () => {
    // Act and assert
    expect(parseVariant(variantId("page--admin-dashboard", "admin-ctsc"))).toEqual({ base: "page--admin-dashboard", viewAs: "admin-ctsc" });
    expect(parseVariant("civil-daily-cause-list")).toEqual({ base: "civil-daily-cause-list", viewAs: null });
  });
});

describe("withMobile", () => {
  it("should add a mobile copy of each main target, not of variants", () => {
    // Act
    const targets = withMobile([{ id: "page--search" }, { id: "page--search@verified-media" }]);

    // Assert
    expect(targets).toEqual([{ id: "page--search" }, { id: "page--search@verified-media" }, { id: "page--search", viewport: "mobile" }]);
  });
});
