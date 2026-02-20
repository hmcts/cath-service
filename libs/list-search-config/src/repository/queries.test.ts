import { beforeEach, describe, expect, it, vi } from "vitest";
import { create, findByListTypeId, update, upsert } from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    listSearchConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn()
    }
  }
}));

describe("list-search-config queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByListTypeId", () => {
    it("should find config by list type id", async () => {
      const mockConfig = {
        listTypeId: 1,
        caseNumberFieldName: "caseNumber",
        caseNameFieldName: "caseName"
      };

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listSearchConfig.findUnique).mockResolvedValue(mockConfig as any);

      const result = await findByListTypeId(1);

      expect(result).toEqual(mockConfig);
      expect(prisma.listSearchConfig.findUnique).toHaveBeenCalledWith({
        where: { listTypeId: 1 }
      });
    });

    it("should return null when config not found", async () => {
      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listSearchConfig.findUnique).mockResolvedValue(null);

      const result = await findByListTypeId(999);

      expect(result).toBeNull();
      expect(prisma.listSearchConfig.findUnique).toHaveBeenCalledWith({
        where: { listTypeId: 999 }
      });
    });

    it("should handle different list type ids", async () => {
      const mockConfig = {
        listTypeId: 5,
        caseNumberFieldName: "case_num",
        caseNameFieldName: "case_name"
      };

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listSearchConfig.findUnique).mockResolvedValue(mockConfig as any);

      const result = await findByListTypeId(5);

      expect(result).toEqual(mockConfig);
      expect(prisma.listSearchConfig.findUnique).toHaveBeenCalledWith({
        where: { listTypeId: 5 }
      });
    });
  });

  describe("create", () => {
    it("should create new config", async () => {
      const data = {
        caseNumberFieldName: "caseNumber",
        caseNameFieldName: "caseName"
      };

      const mockCreatedConfig = {
        listTypeId: 1,
        ...data
      };

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listSearchConfig.create).mockResolvedValue(mockCreatedConfig as any);

      const result = await create(1, data);

      expect(result).toEqual(mockCreatedConfig);
      expect(prisma.listSearchConfig.create).toHaveBeenCalledWith({
        data: {
          listTypeId: 1,
          caseNumberFieldName: "caseNumber",
          caseNameFieldName: "caseName"
        }
      });
    });

    it("should create config with different field names", async () => {
      const data = {
        caseNumberFieldName: "case_num_123",
        caseNameFieldName: "case_name_field"
      };

      const mockCreatedConfig = {
        listTypeId: 2,
        ...data
      };

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listSearchConfig.create).mockResolvedValue(mockCreatedConfig as any);

      const result = await create(2, data);

      expect(result).toEqual(mockCreatedConfig);
      expect(prisma.listSearchConfig.create).toHaveBeenCalledWith({
        data: {
          listTypeId: 2,
          caseNumberFieldName: "case_num_123",
          caseNameFieldName: "case_name_field"
        }
      });
    });
  });

  describe("update", () => {
    it("should update existing config", async () => {
      const data = {
        caseNumberFieldName: "newCaseNumber",
        caseNameFieldName: "newCaseName"
      };

      const mockUpdatedConfig = {
        listTypeId: 1,
        ...data
      };

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listSearchConfig.update).mockResolvedValue(mockUpdatedConfig as any);

      const result = await update(1, data);

      expect(result).toEqual(mockUpdatedConfig);
      expect(prisma.listSearchConfig.update).toHaveBeenCalledWith({
        where: { listTypeId: 1 },
        data: {
          caseNumberFieldName: "newCaseNumber",
          caseNameFieldName: "newCaseName"
        }
      });
    });

    it("should update only specified fields", async () => {
      const data = {
        caseNumberFieldName: "updatedField1",
        caseNameFieldName: "updatedField2"
      };

      const mockUpdatedConfig = {
        listTypeId: 3,
        ...data
      };

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listSearchConfig.update).mockResolvedValue(mockUpdatedConfig as any);

      const result = await update(3, data);

      expect(result).toEqual(mockUpdatedConfig);
      expect(prisma.listSearchConfig.update).toHaveBeenCalledWith({
        where: { listTypeId: 3 },
        data: {
          caseNumberFieldName: "updatedField1",
          caseNameFieldName: "updatedField2"
        }
      });
    });
  });

  describe("upsert", () => {
    it("should create config when it does not exist", async () => {
      const data = {
        caseNumberFieldName: "caseNumber",
        caseNameFieldName: "caseName"
      };

      const mockUpsertedConfig = {
        listTypeId: 1,
        ...data
      };

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listSearchConfig.upsert).mockResolvedValue(mockUpsertedConfig as any);

      const result = await upsert(1, data);

      expect(result).toEqual(mockUpsertedConfig);
      expect(prisma.listSearchConfig.upsert).toHaveBeenCalledWith({
        where: { listTypeId: 1 },
        create: {
          listTypeId: 1,
          caseNumberFieldName: "caseNumber",
          caseNameFieldName: "caseName"
        },
        update: {
          caseNumberFieldName: "caseNumber",
          caseNameFieldName: "caseName"
        }
      });
    });

    it("should update config when it exists", async () => {
      const data = {
        caseNumberFieldName: "updatedCaseNumber",
        caseNameFieldName: "updatedCaseName"
      };

      const mockUpsertedConfig = {
        listTypeId: 2,
        ...data
      };

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listSearchConfig.upsert).mockResolvedValue(mockUpsertedConfig as any);

      const result = await upsert(2, data);

      expect(result).toEqual(mockUpsertedConfig);
      expect(prisma.listSearchConfig.upsert).toHaveBeenCalledWith({
        where: { listTypeId: 2 },
        create: {
          listTypeId: 2,
          caseNumberFieldName: "updatedCaseNumber",
          caseNameFieldName: "updatedCaseName"
        },
        update: {
          caseNumberFieldName: "updatedCaseNumber",
          caseNameFieldName: "updatedCaseName"
        }
      });
    });

    it("should handle upsert with special characters in field names", async () => {
      const data = {
        caseNumberFieldName: "case_number_2024",
        caseNameFieldName: "CASE_NAME_FIELD"
      };

      const mockUpsertedConfig = {
        listTypeId: 5,
        ...data
      };

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listSearchConfig.upsert).mockResolvedValue(mockUpsertedConfig as any);

      const result = await upsert(5, data);

      expect(result).toEqual(mockUpsertedConfig);
      expect(prisma.listSearchConfig.upsert).toHaveBeenCalledWith({
        where: { listTypeId: 5 },
        create: {
          listTypeId: 5,
          caseNumberFieldName: "case_number_2024",
          caseNameFieldName: "CASE_NAME_FIELD"
        },
        update: {
          caseNumberFieldName: "case_number_2024",
          caseNameFieldName: "CASE_NAME_FIELD"
        }
      });
    });

    it("should preserve list type id in upsert operation", async () => {
      const data = {
        caseNumberFieldName: "field1",
        caseNameFieldName: "field2"
      };

      const mockUpsertedConfig = {
        listTypeId: 99,
        ...data
      };

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listSearchConfig.upsert).mockResolvedValue(mockUpsertedConfig as any);

      const result = await upsert(99, data);

      expect(result.listTypeId).toBe(99);
      expect(prisma.listSearchConfig.upsert).toHaveBeenCalledWith({
        where: { listTypeId: 99 },
        create: expect.objectContaining({ listTypeId: 99 }),
        update: expect.any(Object)
      });
    });
  });
});
