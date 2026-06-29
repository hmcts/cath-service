import { pathToFileURL } from "node:url";
const VALID_METHODS = ["get", "post", "put", "patch", "delete", "del", "head", "options", "trace", "connect", "all"];
export async function loadRouteModule(absolutePath) {
    const fileUrl = pathToFileURL(absolutePath).href;
    const module = await import(fileUrl);
    return module;
}
export function extractHandlers(module) {
    const handlers = new Map();
    const seenMethods = new Set();
    for (const [key, value] of Object.entries(module)) {
        const methodName = key.toLowerCase();
        if (!VALID_METHODS.includes(methodName)) {
            continue;
        }
        if (seenMethods.has(methodName)) {
            throw new Error(`Duplicate method export found: ${key}. Module exports the same method with different casings.`);
        }
        seenMethods.add(methodName);
        if (!isValidHandler(value)) {
            throw new Error(`Invalid handler for method ${key}. Expected a function or array of functions with 2-4 parameters, got ${typeof value}`);
        }
        const normalizedMethod = methodName === "del" ? "delete" : methodName;
        handlers.set(normalizedMethod, value);
    }
    return handlers;
}
function isValidHandler(value) {
    if (typeof value === "function") {
        return isRequestHandler(value);
    }
    if (Array.isArray(value)) {
        return value.length > 0 && value.every((item) => typeof item === "function" && isRequestHandler(item));
    }
    return false;
}
function isRequestHandler(fn) {
    if (typeof fn !== "function")
        return false;
    const arity = fn.length;
    return arity >= 2 && arity <= 4;
}
export function normalizeHandlers(handlerExport) {
    return Array.isArray(handlerExport) ? handlerExport : [handlerExport];
}
