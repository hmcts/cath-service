import type { ParamsDictionary } from "express-serve-static-core";

/**
 * Extract a single string value from Express request params.
 * Handles the case where params can be string | string[] in TypeScript 6.x
 *
 * @param params - The request params object
 * @param key - The param key to extract
 * @returns The first value if array, or the value itself if string, or undefined
 */
export function getParam(params: ParamsDictionary, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Extract a single string value from Express request params as a number.
 *
 * @param params - The request params object
 * @param key - The param key to extract
 * @returns Parsed number or NaN if invalid
 */
export function getParamAsNumber(params: ParamsDictionary, key: string): number {
  const value = getParam(params, key);
  return value ? Number.parseInt(value, 10) : Number.NaN;
}
