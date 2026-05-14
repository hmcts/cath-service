import type { Session } from "express-session";

/**
 * Promisifies the session.save() method to avoid callback hell.
 *
 * @param session - Express session object
 * @returns Promise that resolves when session is saved
 *
 * @example
 * ```typescript
 * req.session.uploadData = data;
 * await saveSession(req.session);
 * res.redirect("/next-page");
 * ```
 */
export function saveSession(session: Session): Promise<void> {
  return new Promise((resolve, reject) => {
    session.save((err) => (err ? reject(err) : resolve()));
  });
}
