import type {} from "@hmcts/auth";
import type { NextFunction, Request, Response } from "express";
import { getPendingCaseSubscriptions, getPendingSubscriptions } from "./pending-subscriptions-store.js";

export function restorePendingSubscriptionsMiddleware() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user?.id) {
      return next();
    }

    if (req.session.pendingSubscriptionsRestored) {
      return next();
    }

    try {
      const [locationIds, caseSubscriptions] = await Promise.all([
        getPendingSubscriptions(req.app.locals.redisClient, req.user.id),
        getPendingCaseSubscriptions(req.app.locals.redisClient, req.user.id)
      ]);

      if (locationIds?.length || caseSubscriptions?.length) {
        if (!req.session.emailSubscriptions) {
          req.session.emailSubscriptions = {};
        }
        if (locationIds?.length) {
          req.session.emailSubscriptions.pendingSubscriptions = locationIds;
        }
        if (caseSubscriptions?.length) {
          req.session.emailSubscriptions.pendingCaseSubscriptions = caseSubscriptions;
        }
      }

      req.session.pendingSubscriptionsRestored = true;
    } catch {
      // Non-fatal — continue without restoring
    }

    next();
  };
}
