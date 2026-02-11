import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getUserById } from "../../../user-management/queries.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const userId = req.params.userId;

  if (!userId) {
    return res.status(404).render("errors/404");
  }

  try {
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).render("errors/404");
    }

    const formattedUser = {
      ...user,
      createdDate: content.formatDate(user.createdDate),
      lastSignedInDate: user.lastSignedInDate ? content.formatDate(user.lastSignedInDate) : content.neverSignedIn
    };

    res.render("manage-user/[userId]/index", {
      ...content,
      user: formattedUser,
      lng: language === "cy" ? "cy" : ""
    });
  } catch (error) {
    console.error("Error fetching user:", {
      error,
      userId,
      timestamp: new Date().toISOString()
    });
    return res.status(500).render("errors/500");
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
