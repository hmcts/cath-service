import { prisma } from "@hmcts/postgres";

export interface ListSearchConfigData {
  caseNumberFieldName: string;
  caseNameFieldName: string;
}

export async function findByListTypeId(listTypeId: number) {
  return await prisma.listSearchConfig.findUnique({
    where: { listTypeId }
  });
}

export async function create(listTypeId: number, data: ListSearchConfigData) {
  return await prisma.listSearchConfig.create({
    data: {
      listTypeId,
      caseNumberFieldName: data.caseNumberFieldName,
      caseNameFieldName: data.caseNameFieldName
    }
  });
}

export async function update(listTypeId: number, data: ListSearchConfigData) {
  return await prisma.listSearchConfig.update({
    where: { listTypeId },
    data: {
      caseNumberFieldName: data.caseNumberFieldName,
      caseNameFieldName: data.caseNameFieldName
    }
  });
}

export async function upsert(listTypeId: number, data: ListSearchConfigData) {
  return await prisma.listSearchConfig.upsert({
    where: { listTypeId },
    create: {
      listTypeId,
      caseNumberFieldName: data.caseNumberFieldName,
      caseNameFieldName: data.caseNameFieldName
    },
    update: {
      caseNumberFieldName: data.caseNumberFieldName,
      caseNameFieldName: data.caseNameFieldName
    }
  });
}
