import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { signedCookies } from "./signed-cookies.js";

function setCookie(key: Buffer, value: unknown, maxAgeSeconds = 60): string {
  const res = { cookie: vi.fn() } as unknown as Response;
  signedCookies(key, true).set(res, "session", value, maxAgeSeconds);
  const [, cookie] = vi.mocked(res.cookie).mock.calls[0];
  return cookie as string;
}

const request = (cookie: string) => ({ headers: { cookie: `other=1; session=${cookie}` } }) as Request;

describe("signedCookies", () => {
  it("should read back what it wrote", () => {
    // Arrange
    const key = Buffer.alloc(32, 1);
    const cookie = setCookie(key, { name: "Tester" });

    // Act
    const value = signedCookies(key, true).get(request(cookie), "session");

    // Assert
    expect(value).toEqual({ name: "Tester" });
  });

  it("should refuse a cookie signed with another key", () => {
    // Arrange
    const cookie = setCookie(Buffer.alloc(32, 1), { name: "Tester" });

    // Act
    const value = signedCookies(Buffer.alloc(32, 2), true).get(request(cookie), "session");

    // Assert
    expect(value).toBeNull();
  });

  it("should refuse a cookie whose content was changed", () => {
    // Arrange
    const key = Buffer.alloc(32, 1);
    const [, signature] = setCookie(key, { name: "Tester" }).split(".");
    const forged = `${Buffer.from(JSON.stringify({ value: { name: "Admin" }, expires: Date.now() + 60_000 })).toString("base64url")}.${signature}`;

    // Act
    const value = signedCookies(key, true).get(request(forged), "session");

    // Assert
    expect(value).toBeNull();
  });

  it("should refuse an expired cookie", () => {
    // Arrange
    const key = Buffer.alloc(32, 1);
    const cookie = setCookie(key, { name: "Tester" }, -1);

    // Act
    const value = signedCookies(key, true).get(request(cookie), "session");

    // Assert
    expect(value).toBeNull();
  });

  it("should set the cookie http-only, same-site and secure when asked", () => {
    // Arrange
    const res = { cookie: vi.fn() } as unknown as Response;

    // Act
    signedCookies(Buffer.alloc(32, 1), true).set(res, "session", {}, 60);

    // Assert
    expect((vi.mocked(res.cookie).mock.calls[0] as unknown[])[2]).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 60_000 });
  });
});
