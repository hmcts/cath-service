import { type ListType, mockListTypes } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const RCJ_LIST_TYPE_IDS = [10, 11, 12, 13, 14, 15, 16, 17, 18];

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const content = locale === "cy" ? cy : en;

  // Query published artefacts for RCJ list types
  const artefacts = await prisma.artefact.findMany({
    where: {
      listTypeId: { in: RCJ_LIST_TYPE_IDS },
      displayFrom: { lte: new Date() },
      displayTo: { gte: new Date() }
    },
    orderBy: [{ lastReceivedDate: "desc" }]
  });

  // Map artefacts to list types with their URLs
  const listTypeMap = new Map<number, { name: string; urlPath: string; artefactId: string }>();

  for (const artefact of artefacts) {
    // Only keep the most recent artefact for each list type
    if (listTypeMap.has(artefact.listTypeId)) {
      continue;
    }

    const listType = mockListTypes.find((lt: ListType) => lt.id === artefact.listTypeId);
    if (listType && listType.urlPath) {
      listTypeMap.set(artefact.listTypeId, {
        name: locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName,
        urlPath: listType.urlPath,
        artefactId: artefact.artefactId
      });
    }
  }

  // Convert map to sorted array
  const rcjListTypes = Array.from(listTypeMap.values()).sort((a, b) => a.name.localeCompare(b.name, locale === "cy" ? "cy" : "en"));

  res.render("royal-courts-of-justice/index", {
    en,
    cy,
    content,
    listTypes: rcjListTypes
  });
};
