import { blockUserAccess, requireAuth } from "@hmcts/auth";
import { deleteListTypeSubscription } from "@hmcts/subscription-list-types";
import type { Request, RequestHandler, Response } from "express";

const postHandler = async (req: Request, res: Response) => {
  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const { listTypeSubscriptionId } = req.body;

  if (!listTypeSubscriptionId) {
    return res.redirect("/subscription-management");
  }

  try {
    await deleteListTypeSubscription(req.user.id, listTypeSubscriptionId);
    res.redirect("/subscription-management");
  } catch (error) {
    console.error("Error deleting list type subscription", { errorMessage: error instanceof Error ? error.message : "Unknown error" });
    res.redirect("/subscription-management?error=delete_failed");
  }
};

export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
