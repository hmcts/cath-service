import { RedisStore } from "connect-redis";
import type { RequestHandler } from "express";
import session, { type SessionOptions } from "express-session";

export function expressSessionRedis(options: ExpressSessionRedisOptions): RequestHandler {
  const { redisConnection, sessionOptions = {}, storeOptions = {} } = options;

  const defaultSessionOptions: SessionOptions = {
    store: new RedisStore({
      client: redisConnection,
      prefix: "sess:",
      ...storeOptions
    }),
    secret: sessionOptions.secret ?? resolveSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      // Lax keeps the cookie off cross-site POSTs; every OAuth callback here returns via GET
      sameSite: "lax",
      maxAge: options.cookieMaxAge || 1000 * 60 * 60 * 4 // 4 hours
    }
  };

  return session({
    ...defaultSessionOptions,
    ...sessionOptions
  });
}

function resolveSessionSecret(): string {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }

  return "default-secret-change-in-production";
}

export type ExpressSessionRedisOptions = {
  redisConnection: any; // Redis client instance from 'redis' package
  sessionOptions?: Partial<SessionOptions>;
  storeOptions?: {
    prefix?: string;
    ttl?: number;
    disableTouch?: boolean;
    disableTTL?: boolean;
  };
  cookieMaxAge?: number;
};
