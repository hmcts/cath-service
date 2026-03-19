import type {} from "@hmcts/auth";
import type { NextFunction, Request, Response } from "express";
import { logAction } from "./logger.js";

declare module "express-serve-static-core" {
  interface Request {
    auditMetadata?: {
      shouldLog?: boolean;
      action?: string;
      entityInfo?: string;
      [key: string]: string | number | boolean | undefined;
    };
  }
}

export function auditLogMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only log POST, PUT, PATCH, DELETE requests (not GET requests for viewing)
    const methodsToLog = ["POST", "PUT", "PATCH", "DELETE"];

    if (!methodsToLog.includes(req.method)) {
      return next();
    }

    // Only log if user is authenticated and has system admin role
    const user = req.user;
    if (!user || user.role !== "SYSTEM_ADMIN") {
      return next();
    }

    // Skip audit log routes themselves to avoid infinite loops
    if (req.path.startsWith("/audit-log")) {
      return next();
    }

    // Capture the original response methods
    const originalRedirect = res.redirect.bind(res);
    const originalRender = res.render.bind(res);
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Flag to ensure we only log completion once per request
    let completionLogged = false;

    const logCompletionEntry = async (outcome: "success" | "validation_error" | "cancelled" | "other", context?: unknown) => {
      if (completionLogged) return;
      completionLogged = true;

      try {
        const action = generateActionName(req);
        const details = generateDetails(req, outcome, context);

        await logAction({
          userId: user.id || "unknown",
          userEmail: user.email || "unknown",
          userRole: user.role || "SYSTEM_ADMIN",
          userProvenance: user.provenance || "azure-ad",
          action,
          details
        });
      } catch (error) {
        console.error("Failed to create completion audit log entry:", error);
      }
    };

    // Override response methods to log completion with outcome
    res.redirect = ((urlOrStatus: string | number, url?: string) => {
      const redirectUrl = typeof urlOrStatus === "number" ? url : urlOrStatus;

      // Check if controller explicitly requested logging
      const explicitlyRequested = req.auditMetadata?.shouldLog === true;

      // Auto-detect validation errors and cancellations
      const outcome = determineRedirectOutcome(redirectUrl || "", req.path, req.session);
      const shouldLog = explicitlyRequested || outcome === "validation_error" || outcome === "cancelled";

      if (shouldLog) {
        logCompletionEntry(outcome === "validation_error" || outcome === "cancelled" ? outcome : "success", redirectUrl);
      }

      if (typeof urlOrStatus === "number") {
        return originalRedirect(urlOrStatus, url!);
      }
      return originalRedirect(urlOrStatus);
    }) as typeof res.redirect;

    res.render = ((view: string, options?: object, callback?: (err: Error, html: string) => void) => {
      // Only log validation errors (render with errors), not successful renders
      const hasErrors = options && typeof options === "object" && "errors" in options && options.errors;
      if (hasErrors) {
        logCompletionEntry("validation_error", options);
      }

      if (callback) {
        return originalRender(view, options, callback);
      }
      if (options) {
        return originalRender(view, options);
      }
      return originalRender(view);
    }) as typeof res.render;

    res.json = ((body?: unknown) => {
      logCompletionEntry("success", body);
      return originalJson(body);
    }) as typeof res.json;

    res.send = ((body?: unknown) => {
      logCompletionEntry("success", body);
      return originalSend(body);
    }) as typeof res.send;

    next();
  };
}

function determineRedirectOutcome(redirectUrl: string, requestPath: string, session?: any): "success" | "validation_error" | "cancelled" | "other" {
  const url = redirectUrl.toLowerCase();
  const cleanUrl = url.split("?")[0]; // Remove query parameters for comparison

  // Check session for validation errors (indicates validation failure, not cancellation)
  // Convention-based detection: any field ending with 'Errors' or 'errors' containing an array
  if (session && typeof session === "object") {
    const sessionKeys = Object.keys(session);
    const errorField = sessionKeys.find((key) => (key.endsWith("Errors") || key.endsWith("errors")) && Array.isArray(session[key]) && session[key].length > 0);

    if (errorField) {
      return "validation_error";
    }
  }

  // Intermediate pages (should not be logged as cancelled)
  if (url.includes("-confirm") || url.includes("-summary") || url.includes("-check")) {
    return "other";
  }

  // Cancellation indicators: redirect to dashboard
  if (url.includes("dashboard")) {
    return "cancelled";
  }

  // If redirecting back to the same page without errors in session, it's likely a cancellation
  const requestPathClean = requestPath.toLowerCase().split("?")[0];
  if (cleanUrl === requestPathClean) {
    return "cancelled";
  }

  return "other";
}

function generateActionName(req: Request): string {
  // Use custom action name if provided
  if (req.auditMetadata?.action && typeof req.auditMetadata.action === "string") {
    return req.auditMetadata.action.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  }

  // Fall back to path-based generation
  const path = req.path;
  const method = req.method;

  // Convert path to action name
  // e.g., POST /reference-data-upload -> REFERENCE_DATA_UPLOAD
  // e.g., POST /delete-court -> DELETE_COURT
  // e.g., POST /add-jurisdiction -> ADD_JURISDICTION
  const pathPart = path
    .replace(/^\//, "") // Remove leading slash
    .replace(/\//g, "_") // Replace slashes with underscores
    .replace(/-/g, "_") // Replace hyphens with underscores
    .toUpperCase();

  // For POST requests, use the path directly
  // For other methods, prefix with the method
  if (method === "POST") {
    return pathPart;
  }

  return `${method}_${pathPart}`;
}

function generateDetails(req: Request, outcome: "success" | "validation_error" | "cancelled" | "other", context?: unknown): string | undefined {
  const details: string[] = [];

  // Extract entity identifiers first (name, ID, etc.) for better context
  const entityInfo = extractEntityInfo(req);
  if (entityInfo) {
    details.push(entityInfo);
  }

  // Add outcome status
  if (outcome === "success") {
    details.push("Status: Completed successfully");
  } else if (outcome === "validation_error") {
    details.push("Status: Validation failed");
  } else if (outcome === "cancelled") {
    details.push("Status: Action cancelled by user");
  }

  // Add file information if present
  if (req.file) {
    details.push(`File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
  }

  // Add multiple files if present
  if (req.files && Array.isArray(req.files)) {
    const fileNames = req.files.map((f) => f.originalname).join(", ");
    details.push(`Files uploaded: ${fileNames}`);
  }

  // Add validation error messages if available (from render context)
  if (outcome === "validation_error" && context && typeof context === "object" && "errors" in context) {
    const errors = context.errors as Array<{ text: string }> | { [key: string]: { text: string } };
    if (Array.isArray(errors) && errors.length > 0) {
      const errorMessages = errors.map((e) => e.text).join("; ");
      details.push(`Errors: ${errorMessages}`);
    }
  }

  // Add validation error messages from session (for redirect patterns)
  if (outcome === "validation_error" && req.session && typeof req.session === "object") {
    const sessionKeys = Object.keys(req.session);
    const errorField = sessionKeys.find(
      (key) => (key.endsWith("Errors") || key.endsWith("errors")) && Array.isArray(req.session[key]) && req.session[key].length > 0
    );

    if (errorField) {
      const sessionErrors = req.session[errorField];
      const errorMessages = sessionErrors.map((e: any) => (typeof e === "object" && e.text ? e.text : String(e))).join("; ");
      details.push(`Errors: ${errorMessages}`);
    }
  }

  return details.length > 0 ? details.join("; ") : undefined;
}

function extractEntityInfo(req: Request): string | undefined {
  // Layer 1: Explicit entityInfo from auditMetadata (highest priority)
  if (req.auditMetadata?.entityInfo && typeof req.auditMetadata.entityInfo === "string") {
    return req.auditMetadata.entityInfo;
  }

  // Use a Map to deduplicate entity info by normalized key name
  const entityMap = new Map<string, string>();

  // Layer 1.5: Other explicit audit metadata fields (excluding special flags)
  if (req.auditMetadata && typeof req.auditMetadata === "object") {
    for (const [key, value] of Object.entries(req.auditMetadata)) {
      // Skip special control fields
      if (["shouldLog", "action", "entityInfo"].includes(key)) continue;

      if (value !== null && value !== undefined && value !== "") {
        entityMap.set(key.toLowerCase(), `${key}: ${value}`);
      }
    }
  }

  // Layer 2: Request body pattern matching (automatic extraction of common fields)
  if (req.body && typeof req.body === "object") {
    // Name fields (most common entity identifier)
    if (req.body.name && typeof req.body.name === "string" && req.body.name.trim()) {
      entityMap.set("name", `Name: ${req.body.name.trim()}`);
    }
    if (req.body.welshName && typeof req.body.welshName === "string" && req.body.welshName.trim()) {
      entityMap.set("welshname", `Welsh Name: ${req.body.welshName.trim()}`);
    }
    if (req.body.title && typeof req.body.title === "string" && req.body.title.trim()) {
      entityMap.set("title", `Title: ${req.body.title.trim()}`);
    }

    // ID fields (common across many entities)
    const idFields = ["id", "locationId", "jurisdictionId", "regionId", "userId", "caseId", "artefactId", "subscriptionId"];
    for (const field of idFields) {
      if (req.body[field] && (typeof req.body[field] === "string" || typeof req.body[field] === "number")) {
        const label = field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
        entityMap.set(field.toLowerCase(), `${label}: ${req.body[field]}`);
      }
    }

    // Email (useful for user-related actions)
    if (req.body.email && typeof req.body.email === "string" && req.body.email.trim()) {
      entityMap.set("email", `Email: ${req.body.email.trim()}`);
    }
  }

  // Layer 3: URL parameters (captures entity identifiers in RESTful routes)
  if (req.params && typeof req.params === "object") {
    for (const [key, value] of Object.entries(req.params)) {
      if (value && typeof value === "string") {
        const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
        entityMap.set(key.toLowerCase(), `${label}: ${value}`);
      }
    }
  }

  // Layer 4: Session pattern matching (lowest priority - generic extraction for multi-step flows)
  if (req.session && typeof req.session === "object") {
    const sessionKeys = Object.keys(req.session);

    // Look for session keys that might contain entity data
    for (const key of sessionKeys) {
      const value = req.session[key];
      if (!value || typeof value !== "object") continue;

      // Skip internal session fields
      if (["cookie", "passport"].includes(key)) continue;

      // Extract name from session objects
      if ("name" in value && typeof value.name === "string" && value.name.trim()) {
        const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
        const mapKey = `${key}_name`.toLowerCase();
        entityMap.set(mapKey, `${label}: ${value.name.trim()}`);
      }

      // Extract ID fields from session objects
      if ("id" in value && (typeof value.id === "string" || typeof value.id === "number")) {
        const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
        const mapKey = `${key}_id`.toLowerCase();
        entityMap.set(mapKey, `${label} ID: ${value.id}`);
      }
      if ("locationId" in value && (typeof value.locationId === "string" || typeof value.locationId === "number")) {
        entityMap.set("locationid", `Location ID: ${value.locationId}`);
      }

      // Extract filename from upload sessions
      if ("fileName" in value && typeof value.fileName === "string") {
        const mapKey = `${key}_filename`.toLowerCase();
        entityMap.set(mapKey, `File: ${value.fileName}`);
      }
    }
  }

  // Convert Map values to array and join
  const entityParts = Array.from(entityMap.values());
  return entityParts.length > 0 ? entityParts.join(", ") : undefined;
}
