import type { Request } from "express";
import "express-session";

export interface MediaApplicationFormData {
  fullName: string;
  email: string;
  employer: string;
  termsAccepted: boolean;
}

export interface ValidationError {
  text: string;
  href: string;
}

export interface MediaApplicationCreateData {
  fullName: string;
  email: string;
  employer: string;
}

declare module "express-session" {
  interface SessionData {
    mediaApplicationForm?: MediaApplicationFormData;
    mediaApplicationErrors?: ValidationError[];
    mediaApplicationSubmitted?: boolean;
  }
}

export interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
