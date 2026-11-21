import { API_ROLE, authenticateApi, buildMessage } from "@hmcts/blob-ingestion";
import { type OtpEmailResult, sendOtpEmail } from "@hmcts/notifications";
import type { NextFunction, Request, Response } from "express";
import express from "express";

const BODY_LIMIT = "10kb";
// pip-publication-services maps its TooManyEmailsException to 429.
const RATE_LIMIT_STATUS = 429;
const MALFORMED_BODY_MESSAGE = "Malformed JSON request body";
const BODY_TOO_LARGE_MESSAGE = "Request body too large";

// Authentication runs first, so a body is only parsed for an authenticated caller.
export const POST = [
  authenticateApi(API_ROLE.B2C),
  express.json({ limit: BODY_LIMIT }),
  handleBodyParseError,
  async (req: Request, res: Response) => {
    try {
      const result = await sendOtpEmail(req.body);
      return respondToOtpResult(res, result);
    } catch (error) {
      // The message is deliberately not logged: it can carry connection or configuration detail.
      console.error("Unexpected error in OTP endpoint:", {
        name: error instanceof Error ? error.name : "Unknown",
        code: error instanceof Error && "code" in error ? error.code : undefined
      });
      return res.status(500).json(buildMessage("Internal server error"));
    }
  }
];

// Handled here rather than by the global error handler, which logs err.stack: a JSON SyntaxError
// message quotes the input and body-parser attaches the raw body, so the OTP and email would be logged.
function handleBodyParseError(error: BodyParserError, _req: Request, res: Response, next: NextFunction) {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json(buildMessage(MALFORMED_BODY_MESSAGE));
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json(buildMessage(BODY_TOO_LARGE_MESSAGE));
  }

  return next(error);
}

function respondToOtpResult(res: Response, result: OtpEmailResult) {
  switch (result.outcome) {
    case "SENT":
      return res.status(200).type("text/plain").send(result.referenceId);
    case "RATE_LIMITED":
      return res.status(RATE_LIMIT_STATUS).json(buildMessage(result.message));
    case "VALIDATION_ERROR":
    case "NOTIFY_ERROR":
      return res.status(400).json(buildMessage(result.message));
  }
}

interface BodyParserError extends Error {
  type?: string;
}
