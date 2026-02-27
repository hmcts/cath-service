import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { deleteUserById, getUserById } from "../../../user-management/queries.js";
import { validateDeleteConfirmation } from "../../../user-management/validation.js";
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

    // Prevent self-deletion
    if (req.user?.id === userId) {
      return res.status(403).render("errors/403", {
        message: content.cannotDeleteSelfError
      });
    }

    res.render("delete-user-confirm/[userId]/index", {
      ...content,
      user,
      lng: language === "cy" ? "cy" : ""
    });
  } catch (error) {
    console.error("Error fetching user for deletion confirmation:", {
      error,
      userId,
      timestamp: new Date().toISOString()
    });
    return res.status(500).render("errors/500");
  }
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const userId = req.params.userId;

  if (!userId) {
    return res.status(404).render("errors/404");
  }

  const confirmation = req.body.confirmation;
  const validationError = validateDeleteConfirmation(confirmation);

  if (validationError) {
    try {
      const user = await getUserById(userId);
      if (!user) {
        return res.status(404).render("errors/404");
      }

      return res.render("delete-user-confirm/[userId]/index", {
        ...content,
        user,
        errors: [validationError],
        lng: language === "cy" ? "cy" : ""
      });
    } catch (error) {
      console.error("Error fetching user for validation re-render:", {
        error,
        userId,
        validationError,
        timestamp: new Date().toISOString()
      });
      return res.status(500).render("errors/500");
    }
  }

  if (confirmation === "no") {
    return res.redirect(`/manage-user/${userId}${language === "cy" ? "?lng=cy" : ""}`);
  }

  // Prevent self-deletion
  if (req.user?.id === userId) {
    return res.status(403).render("errors/403", {
      message: content.cannotDeleteSelfError
    });
  }

  try {
    await deleteUserById(userId);
    res.redirect(`/delete-user-success${language === "cy" ? "?lng=cy" : ""}`);
  } catch (error) {
    console.error("Error deleting user:", {
      error,
      userId,
      timestamp: new Date().toISOString()
    });
    return res.status(500).render("errors/500");
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
