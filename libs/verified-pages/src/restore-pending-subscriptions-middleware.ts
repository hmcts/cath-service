import type { NextFunction, Request, Response } from "express";
import { getPendingSubscriptions } from "./pending-subscriptions-store.js";

export function restorePendingSubscriptionsMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user?.id) {
      return next();
    }

    if (req.session.pendingSubscriptionsRestored) {
      return next();
    }

    req.session.pendingSubscriptionsRestored = true;

    if (req.session.emailSubscriptions?.pendingSubscriptions?.length) {
      return next();
    }

    try {
      const locationIds = await getPendingSubscriptions(req.app.locals.redisClient, req.user.id);
      if (locationIds?.length) {
        if (!req.session.emailSubscriptions) {
          req.session.emailSubscriptions = {};
        }
        req.session.emailSubscriptions.pendingSubscriptions = locationIds;
      }
    } catch {
      // Non-fatal — continue without restoring
    }

    next();
  };
}
