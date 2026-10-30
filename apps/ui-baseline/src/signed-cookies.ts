import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

// Cookies holding JSON, signed with an HMAC so they cannot be forged, and carrying their own expiry
export function signedCookies(key: Buffer, secure: boolean) {
  const sign = (value: string) => createHmac("sha256", key).update(value).digest("base64url");
  return {
    set(res: Response, name: string, value: unknown, maxAgeSeconds: number) {
      const payload = Buffer.from(JSON.stringify({ value, expires: Date.now() + maxAgeSeconds * 1000 })).toString("base64url");
      res.cookie(name, `${payload}.${sign(payload)}`, { httpOnly: true, secure, sameSite: "lax", maxAge: maxAgeSeconds * 1000, path: "/" });
    },
    get<T>(req: Request, name: string): T | null {
      const raw = cookieValue(req.headers.cookie, name);
      const [payload, signature] = raw?.split(".") ?? [];
      if (!payload || !signature) return null;
      const expected = Buffer.from(sign(payload));
      const actual = Buffer.from(signature);
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
      const { value, expires } = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as { value: T; expires: number };
      return expires > Date.now() ? value : null;
    },
    clear(res: Response, name: string) {
      res.clearCookie(name, { path: "/" });
    }
  };
}

function cookieValue(header: string | undefined, name: string): string | undefined {
  return header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
