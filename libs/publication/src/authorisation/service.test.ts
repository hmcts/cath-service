import type { UserProfile } from "@hmcts/auth";
import type { ListType } from "@hmcts/list-types-common";
import { describe, expect, it } from "vitest";
import type { Artefact } from "../repository/model.js";
import { Sensitivity } from "../sensitivity.js";
import {
  canAccessPublication,
  canAccessPublicationData,
  canAccessPublicationMetadata,
  filterAccessiblePublications,
  filterPublicationsForSummary
} from "./service.js";

// Test data helpers
const createArtefact = (sensitivity: Sensitivity): Artefact => ({
  artefactId: "test-id",
  locationId: "1",
  listTypeId: 1,
  contentDate: new Date(),
  sensitivity,
  language: "ENGLISH",
  displayFrom: new Date(),
  displayTo: new Date(),
  isFlatFile: false,
  provenance: "CFT_IDAM",
  noMatch: false
});

const createListType = (provenance: string): ListType => ({
  id: 1,
  listType: "test-list",
  englishFriendlyName: "Test List",
  welshFriendlyName: "Rhestr Prawf",
  jsonSchema: {},
  provenance,
  urlPath: "/test"
});

const createUser = (role: string, provenance: string): UserProfile => ({
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  role,
  provenance
});

describe("canAccessPublication", () => {
  describe("PUBLIC publications", () => {
    const publicArtefact = createArtefact(Sensitivity.PUBLIC);

    it("should allow unauthenticated users", () => {
      expect(canAccessPublication(undefined, publicArtefact, undefined)).toBe(true);
    });

    it("should allow authenticated users", () => {
      const user = createUser("VERIFIED", "B2C_IDAM");
      expect(canAccessPublication(user, publicArtefact, undefined)).toBe(true);
    });

    it("should allow system admin", () => {
      const user = createUser("SYSTEM_ADMIN", "SSO");
      expect(canAccessPublication(user, publicArtefact, undefined)).toBe(true);
    });

    it("should allow local admin", () => {
      const user = createUser("INTERNAL_ADMIN_LOCAL", "SSO");
      expect(canAccessPublication(user, publicArtefact, undefined)).toBe(true);
    });

    it("should allow CTSC admin", () => {
      const user = createUser("INTERNAL_ADMIN_CTSC", "SSO");
      expect(canAccessPublication(user, publicArtefact, undefined)).toBe(true);
    });
  });

  describe("PRIVATE publications", () => {
    const privateArtefact = createArtefact(Sensitivity.PRIVATE);

    it("should deny unauthenticated users", () => {
      expect(canAccessPublication(undefined, privateArtefact, undefined)).toBe(false);
    });

    it("should allow B2C verified users", () => {
      const user = createUser("VERIFIED", "B2C_IDAM");
      expect(canAccessPublication(user, privateArtefact, undefined)).toBe(true);
    });

    it("should allow CFT_IDAM verified users", () => {
      const user = createUser("VERIFIED", "CFT_IDAM");
      expect(canAccessPublication(user, privateArtefact, undefined)).toBe(true);
    });

    it("should allow CRIME_IDAM verified users", () => {
      const user = createUser("VERIFIED", "CRIME_IDAM");
      expect(canAccessPublication(user, privateArtefact, undefined)).toBe(true);
    });

    it("should allow system admin", () => {
      const user = createUser("SYSTEM_ADMIN", "SSO");
      expect(canAccessPublication(user, privateArtefact, undefined)).toBe(true);
    });

    it("should deny local admin (they can only see PUBLIC on public pages)", () => {
      const user = createUser("INTERNAL_ADMIN_LOCAL", "SSO");
      expect(canAccessPublication(user, privateArtefact, undefined)).toBe(false);
    });

    it("should deny CTSC admin (they can only see PUBLIC on public pages)", () => {
      const user = createUser("INTERNAL_ADMIN_CTSC", "SSO");
      expect(canAccessPublication(user, privateArtefact, undefined)).toBe(false);
    });

    it("should deny non-verified users", () => {
      const user = createUser("PUBLIC", "PUBLIC");
      expect(canAccessPublication(user, privateArtefact, undefined)).toBe(false);
    });
  });

  describe("CLASSIFIED publications", () => {
    const classifiedArtefact = createArtefact(Sensitivity.CLASSIFIED);

    it("should deny unauthenticated users", () => {
      const listType = createListType("CFT_IDAM");
      expect(canAccessPublication(undefined, classifiedArtefact, listType)).toBe(false);
    });

    it("should deny when list type is not found", () => {
      const user = createUser("VERIFIED", "B2C_IDAM");
      expect(canAccessPublication(user, classifiedArtefact, undefined)).toBe(false);
    });

    it("should allow system admin regardless of provenance", () => {
      const user = createUser("SYSTEM_ADMIN", "SSO");
      const listType = createListType("CFT_IDAM");
      expect(canAccessPublication(user, classifiedArtefact, listType)).toBe(true);
    });

    it("should allow verified user with matching provenance", () => {
      const user = createUser("VERIFIED", "CFT_IDAM");
      const listType = createListType("CFT_IDAM");
      expect(canAccessPublication(user, classifiedArtefact, listType)).toBe(true);
    });

    it("should deny verified user with non-matching provenance", () => {
      const user = createUser("VERIFIED", "B2C_IDAM");
      const listType = createListType("CFT_IDAM");
      expect(canAccessPublication(user, classifiedArtefact, listType)).toBe(false);
    });

    it("should deny local admin (they can only see PUBLIC on public pages)", () => {
      const user = createUser("INTERNAL_ADMIN_LOCAL", "SSO");
      const listType = createListType("CFT_IDAM");
      expect(canAccessPublication(user, classifiedArtefact, listType)).toBe(false);
    });

    it("should deny CTSC admin (they can only see PUBLIC on public pages)", () => {
      const user = createUser("INTERNAL_ADMIN_CTSC", "SSO");
      const listType = createListType("CFT_IDAM");
      expect(canAccessPublication(user, classifiedArtefact, listType)).toBe(false);
    });

    it("should deny public users", () => {
      const user = createUser("PUBLIC", "PUBLIC");
      const listType = createListType("CFT_IDAM");
      expect(canAccessPublication(user, classifiedArtefact, listType)).toBe(false);
    });

    it("should handle B2C_IDAM with CRIME_IDAM list type", () => {
      const user = createUser("VERIFIED", "B2C_IDAM");
      const listType = createListType("CRIME_IDAM");
      expect(canAccessPublication(user, classifiedArtefact, listType)).toBe(false);
    });

    it("should handle CRIME_IDAM with CRIME_IDAM list type", () => {
      const user = createUser("VERIFIED", "CRIME_IDAM");
      const listType = createListType("CRIME_IDAM");
      expect(canAccessPublication(user, classifiedArtefact, listType)).toBe(true);
    });
  });

  describe("Missing sensitivity", () => {
    it("should default to CLASSIFIED (fail closed)", () => {
      const artefact = { ...createArtefact(Sensitivity.PUBLIC), sensitivity: "" };
      const user = createUser("VERIFIED", "B2C_IDAM");
      const listType = createListType("CFT_IDAM");

      // Should deny access without provenance match since it defaults to CLASSIFIED
      expect(canAccessPublication(user, artefact, listType)).toBe(false);
    });

    it("should allow access when provenance matches after defaulting to CLASSIFIED", () => {
      const artefact = { ...createArtefact(Sensitivity.PUBLIC), sensitivity: "" };
      const user = createUser("VERIFIED", "CFT_IDAM");
      const listType = createListType("CFT_IDAM");

      // Should allow access with provenance match since it defaults to CLASSIFIED
      expect(canAccessPublication(user, artefact, listType)).toBe(true);
    });
  });
});

describe("canAccessPublicationData", () => {
  describe("PUBLIC publications", () => {
    const publicArtefact = createArtefact(Sensitivity.PUBLIC);

    it("should allow everyone including unauthenticated", () => {
      expect(canAccessPublicationData(undefined, publicArtefact, undefined)).toBe(true);
    });

    it("should allow local admin", () => {
      const user = createUser("INTERNAL_ADMIN_LOCAL", "SSO");
      expect(canAccessPublicationData(user, publicArtefact, undefined)).toBe(true);
    });

    it("should allow CTSC admin", () => {
      const user = createUser("INTERNAL_ADMIN_CTSC", "SSO");
      expect(canAccessPublicationData(user, publicArtefact, undefined)).toBe(true);
    });
  });

  describe("PRIVATE publications", () => {
    const privateArtefact = createArtefact(Sensitivity.PRIVATE);

    it("should deny local admin (metadata only)", () => {
      const user = createUser("INTERNAL_ADMIN_LOCAL", "SSO");
      expect(canAccessPublicationData(user, privateArtefact, undefined)).toBe(false);
    });

    it("should deny CTSC admin (metadata only)", () => {
      const user = createUser("INTERNAL_ADMIN_CTSC", "SSO");
      expect(canAccessPublicationData(user, privateArtefact, undefined)).toBe(false);
    });

    it("should allow system admin", () => {
      const user = createUser("SYSTEM_ADMIN", "SSO");
      expect(canAccessPublicationData(user, privateArtefact, undefined)).toBe(true);
    });

    it("should allow verified users", () => {
      const user = createUser("VERIFIED", "B2C_IDAM");
      expect(canAccessPublicationData(user, privateArtefact, undefined)).toBe(true);
    });

    it("should deny unauthenticated users", () => {
      expect(canAccessPublicationData(undefined, privateArtefact, undefined)).toBe(false);
    });
  });

  describe("CLASSIFIED publications", () => {
    const classifiedArtefact = createArtefact(Sensitivity.CLASSIFIED);
    const listType = createListType("CFT_IDAM");

    it("should deny local admin (metadata only)", () => {
      const user = createUser("INTERNAL_ADMIN_LOCAL", "SSO");
      expect(canAccessPublicationData(user, classifiedArtefact, listType)).toBe(false);
    });

    it("should deny CTSC admin (metadata only)", () => {
      const user = createUser("INTERNAL_ADMIN_CTSC", "SSO");
      expect(canAccessPublicationData(user, classifiedArtefact, listType)).toBe(false);
    });

    it("should allow system admin", () => {
      const user = createUser("SYSTEM_ADMIN", "SSO");
      expect(canAccessPublicationData(user, classifiedArtefact, listType)).toBe(true);
    });

    it("should allow verified user with matching provenance", () => {
      const user = createUser("VERIFIED", "CFT_IDAM");
      expect(canAccessPublicationData(user, classifiedArtefact, listType)).toBe(true);
    });

    it("should deny verified user with non-matching provenance", () => {
      const user = createUser("VERIFIED", "B2C_IDAM");
      expect(canAccessPublicationData(user, classifiedArtefact, listType)).toBe(false);
    });
  });
});

describe("canAccessPublicationMetadata", () => {
  describe("PUBLIC publications", () => {
    const publicArtefact = createArtefact(Sensitivity.PUBLIC);

    it("should allow unauthenticated users", () => {
      expect(canAccessPublicationMetadata(undefined, publicArtefact)).toBe(true);
    });

    it("should allow all authenticated users", () => {
      const user = createUser("VERIFIED", "B2C_IDAM");
      expect(canAccessPublicationMetadata(user, publicArtefact)).toBe(true);
    });
  });

  describe("PRIVATE publications", () => {
    const privateArtefact = createArtefact(Sensitivity.PRIVATE);

    it("should deny unauthenticated users", () => {
      expect(canAccessPublicationMetadata(undefined, privateArtefact)).toBe(false);
    });

    it("should allow system admin", () => {
      const user = createUser("SYSTEM_ADMIN", "SSO");
      expect(canAccessPublicationMetadata(user, privateArtefact)).toBe(true);
    });

    it("should deny local admin (they can only see PUBLIC metadata)", () => {
      const user = createUser("INTERNAL_ADMIN_LOCAL", "SSO");
      expect(canAccessPublicationMetadata(user, privateArtefact)).toBe(false);
    });

    it("should deny CTSC admin (they can only see PUBLIC metadata)", () => {
      const user = createUser("INTERNAL_ADMIN_CTSC", "SSO");
      expect(canAccessPublicationMetadata(user, privateArtefact)).toBe(false);
    });

    it("should allow verified users", () => {
      const user = createUser("VERIFIED", "B2C_IDAM");
      expect(canAccessPublicationMetadata(user, privateArtefact)).toBe(true);
    });
  });

  describe("CLASSIFIED publications", () => {
    const classifiedArtefact = createArtefact(Sensitivity.CLASSIFIED);
    const listType = createListType("CFT_IDAM");

    it("should deny unauthenticated users", () => {
      expect(canAccessPublicationMetadata(undefined, classifiedArtefact, listType)).toBe(false);
    });

    it("should allow system admin", () => {
      const user = createUser("SYSTEM_ADMIN", "SSO");
      expect(canAccessPublicationMetadata(user, classifiedArtefact, listType)).toBe(true);
    });

    it("should deny local admin (they can only see PUBLIC metadata)", () => {
      const user = createUser("INTERNAL_ADMIN_LOCAL", "SSO");
      expect(canAccessPublicationMetadata(user, classifiedArtefact, listType)).toBe(false);
    });

    it("should deny CTSC admin (they can only see PUBLIC metadata)", () => {
      const user = createUser("INTERNAL_ADMIN_CTSC", "SSO");
      expect(canAccessPublicationMetadata(user, classifiedArtefact, listType)).toBe(false);
    });

    it("should allow verified users with matching provenance", () => {
      const user = createUser("VERIFIED", "CFT_IDAM");
      expect(canAccessPublicationMetadata(user, classifiedArtefact, listType)).toBe(true);
    });

    it("should deny verified users with non-matching provenance", () => {
      const user = createUser("VERIFIED", "B2C_IDAM");
      expect(canAccessPublicationMetadata(user, classifiedArtefact, listType)).toBe(false);
    });
  });
});

describe("filterAccessiblePublications", () => {
  const publicArtefact = createArtefact(Sensitivity.PUBLIC);
  const privateArtefact = { ...createArtefact(Sensitivity.PRIVATE), artefactId: "private-id" };
  const classifiedArtefact = { ...createArtefact(Sensitivity.CLASSIFIED), artefactId: "classified-id" };

  const listTypes = [createListType("CFT_IDAM"), { ...createListType("CRIME_IDAM"), id: 2 }];

  const artefacts = [
    publicArtefact,
    privateArtefact,
    { ...classifiedArtefact, listTypeId: 1 },
    { ...classifiedArtefact, artefactId: "classified-id-2", listTypeId: 2 }
  ];

  it("should return only PUBLIC for unauthenticated users", () => {
    const filtered = filterAccessiblePublications(undefined, artefacts, listTypes);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].artefactId).toBe(publicArtefact.artefactId);
  });

  it("should return PUBLIC and PRIVATE for verified users", () => {
    const user = createUser("VERIFIED", "B2C_IDAM");
    const filtered = filterAccessiblePublications(user, artefacts, listTypes);

    // Should get PUBLIC and PRIVATE, but not CLASSIFIED (provenance mismatch)
    expect(filtered).toHaveLength(2);
    expect(filtered.map((a) => a.artefactId).sort()).toEqual([publicArtefact.artefactId, privateArtefact.artefactId].sort());
  });

  it("should return PUBLIC, PRIVATE, and matching CLASSIFIED for verified users", () => {
    const user = createUser("VERIFIED", "CFT_IDAM");
    const filtered = filterAccessiblePublications(user, artefacts, listTypes);

    // Should get PUBLIC, PRIVATE, and one CLASSIFIED (CFT_IDAM)
    expect(filtered).toHaveLength(3);
    expect(filtered.map((a) => a.artefactId).sort()).toEqual([publicArtefact.artefactId, privateArtefact.artefactId, "classified-id"].sort());
  });

  it("should return all for system admin", () => {
    const user = createUser("SYSTEM_ADMIN", "SSO");
    const filtered = filterAccessiblePublications(user, artefacts, listTypes);
    expect(filtered).toHaveLength(4);
  });

  it("should return only PUBLIC for local admin (they can only see PUBLIC on public pages)", () => {
    const user = createUser("INTERNAL_ADMIN_LOCAL", "SSO");
    const filtered = filterAccessiblePublications(user, artefacts, listTypes);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].artefactId).toBe(publicArtefact.artefactId);
  });

  it("should return only PUBLIC for CTSC admin (they can only see PUBLIC on public pages)", () => {
    const user = createUser("INTERNAL_ADMIN_CTSC", "SSO");
    const filtered = filterAccessiblePublications(user, artefacts, listTypes);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].artefactId).toBe(publicArtefact.artefactId);
  });

  it("should handle empty artefacts array", () => {
    const user = createUser("VERIFIED", "B2C_IDAM");
    const filtered = filterAccessiblePublications(user, [], listTypes);
    expect(filtered).toHaveLength(0);
  });

  it("should handle missing list type", () => {
    const user = createUser("VERIFIED", "CFT_IDAM");
    const artefactsWithUnknownType = [{ ...classifiedArtefact, listTypeId: 999 }];
    const filtered = filterAccessiblePublications(user, artefactsWithUnknownType, listTypes);

    // Should filter out artefact with unknown list type (fail closed)
    expect(filtered).toHaveLength(0);
  });
});

describe("filterPublicationsForSummary", () => {
  const publicArtefact = createArtefact(Sensitivity.PUBLIC);
  const privateArtefact = { ...createArtefact(Sensitivity.PRIVATE), artefactId: "private-id" };
  const classifiedArtefact = { ...createArtefact(Sensitivity.CLASSIFIED), artefactId: "classified-id" };

  const listTypes = [createListType("CFT_IDAM"), { ...createListType("CRIME_IDAM"), id: 2 }];

  const artefacts = [
    publicArtefact,
    privateArtefact,
    { ...classifiedArtefact, listTypeId: 1 },
    { ...classifiedArtefact, artefactId: "classified-id-2", listTypeId: 2 }
  ];

  it("should return only PUBLIC for unauthenticated users", () => {
    const filtered = filterPublicationsForSummary(undefined, artefacts, listTypes);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].artefactId).toBe(publicArtefact.artefactId);
  });

  it("should return PUBLIC and PRIVATE for verified users", () => {
    const user = createUser("VERIFIED", "B2C_IDAM");
    const filtered = filterPublicationsForSummary(user, artefacts, listTypes);

    // Should get PUBLIC and PRIVATE, but not CLASSIFIED (provenance mismatch)
    expect(filtered).toHaveLength(2);
    expect(filtered.map((a) => a.artefactId).sort()).toEqual([publicArtefact.artefactId, privateArtefact.artefactId].sort());
  });

  it("should return PUBLIC, PRIVATE, and matching CLASSIFIED for verified users", () => {
    const user = createUser("VERIFIED", "CFT_IDAM");
    const filtered = filterPublicationsForSummary(user, artefacts, listTypes);

    // Should get PUBLIC, PRIVATE, and one CLASSIFIED (CFT_IDAM)
    expect(filtered).toHaveLength(3);
    expect(filtered.map((a) => a.artefactId).sort()).toEqual([publicArtefact.artefactId, privateArtefact.artefactId, "classified-id"].sort());
  });

  it("should return all for system admin", () => {
    const user = createUser("SYSTEM_ADMIN", "SSO");
    const filtered = filterPublicationsForSummary(user, artefacts, listTypes);
    expect(filtered).toHaveLength(4);
  });

  it("should return only PUBLIC for local admin (they can only see PUBLIC metadata)", () => {
    const user = createUser("INTERNAL_ADMIN_LOCAL", "SSO");
    const filtered = filterPublicationsForSummary(user, artefacts, listTypes);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].artefactId).toBe(publicArtefact.artefactId);
  });

  it("should return only PUBLIC for CTSC admin (they can only see PUBLIC metadata)", () => {
    const user = createUser("INTERNAL_ADMIN_CTSC", "SSO");
    const filtered = filterPublicationsForSummary(user, artefacts, listTypes);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].artefactId).toBe(publicArtefact.artefactId);
  });

  it("should handle empty artefacts array", () => {
    const user = createUser("VERIFIED", "B2C_IDAM");
    const filtered = filterPublicationsForSummary(user, [], listTypes);
    expect(filtered).toHaveLength(0);
  });

  it("should handle missing list type", () => {
    const user = createUser("VERIFIED", "CFT_IDAM");
    const artefactsWithUnknownType = [{ ...classifiedArtefact, listTypeId: 999 }];
    const filtered = filterPublicationsForSummary(user, artefactsWithUnknownType, listTypes);

    // Should filter out artefact with unknown list type (fail closed)
    expect(filtered).toHaveLength(0);
  });
});
