import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Router as expressRouter } from "express";
import { discoverRoutes, sortRoutes } from "./route-discovery.js";
import { extractHandlers, loadRouteModule, normalizeHandlers } from "./route-loader.js";
export async function createSimpleRouter(...mounts) {
    const router = expressRouter();
    if (mounts.length === 0) {
        throw new Error("At least one mount specification is required");
    }
    try {
        const allRoutes = await discoverAndLoadRoutes(mounts);
        validateRoutes(allRoutes);
        mountRoutes(router, allRoutes);
    }
    catch (error) {
        console.error("Failed to initialize file-system router:", error);
        throw error;
    }
    return router;
}
async function discoverAndLoadRoutes(mounts) {
    const allRoutes = [];
    for (const mountSpec of mounts) {
        const mountRoutes = await processMountSpec(mountSpec);
        allRoutes.push(...mountRoutes);
    }
    return allRoutes;
}
async function processMountSpec(mountSpec) {
    const dir = process.env.NODE_ENV === "production" ? mountSpec.path.replace("/src/", "/dist/") : mountSpec.path;
    const routesDir = resolve(dir);
    if (!existsSync(routesDir)) {
        throw new Error(`Routes directory does not exist: ${routesDir}`);
    }
    const prefix = normalizePrefix(mountSpec.prefix || "");
    const routes = discoverAndSortRoutes(routesDir);
    const routeEntries = [];
    for (const route of routes) {
        const moduleRoutes = await loadModuleRoutes(route, prefix, mountSpec);
        routeEntries.push(...moduleRoutes);
    }
    return routeEntries;
}
function discoverAndSortRoutes(pagesDir) {
    const discoveredRoutes = discoverRoutes(pagesDir);
    return sortRoutes(discoveredRoutes);
}
async function loadModuleRoutes(route, prefix, mountSpec) {
    const module = await loadRouteModule(route.absolutePath);
    const handlers = extractHandlers(module);
    const routeEntries = [];
    // Check if module exports ROUTES array for multiple path registration
    const routes = getRoutePaths(module, route.urlPath);
    const fullPaths = routes.map((r) => buildFullPath(prefix, r));
    // Add method handlers for each path
    for (const fullPath of fullPaths) {
        for (const [method, handlerExport] of handlers.entries()) {
            routeEntries.push({
                path: fullPath,
                method,
                handlers: normalizeHandlers(handlerExport),
                sourcePath: route.absolutePath,
                mountSpec
            });
        }
        // Add error handler if present
        // Note: Error handlers have 4 params (err, req, res, next) vs regular handlers with 3
        // Express handles this difference internally based on function arity
        if (module.onError) {
            routeEntries.push({
                path: fullPath,
                method: "use",
                // Cast to any[] first to bypass TypeScript's strict checking
                // Express internally handles both 3-param and 4-param handlers
                handlers: [module.onError],
                sourcePath: route.absolutePath,
                mountSpec
            });
        }
    }
    return routeEntries;
}
function getRoutePaths(module, defaultPath) {
    if (Array.isArray(module.ROUTES) && module.ROUTES.length > 0 && module.ROUTES.every((r) => typeof r === "string")) {
        return module.ROUTES;
    }
    return [defaultPath];
}
function buildFullPath(prefix, urlPath) {
    if (prefix === "/") {
        return urlPath;
    }
    return `${prefix}${urlPath === "/" ? "" : urlPath}`;
}
function normalizePrefix(prefix) {
    if (!prefix || prefix === "/") {
        return "/";
    }
    let normalized = prefix;
    if (!normalized.startsWith("/")) {
        normalized = `/${normalized}`;
    }
    if (normalized.endsWith("/") && normalized !== "/") {
        normalized = normalized.slice(0, -1);
    }
    return normalized;
}
function validateRoutes(routes) {
    const routeMap = new Map();
    for (const route of routes) {
        const key = `${route.method.toUpperCase()} ${route.path}`;
        if (routeMap.has(key)) {
            const existing = routeMap.get(key);
            throw new Error(`Route conflict detected:\n` +
                `  ${key}\n` +
                `  Defined in:\n` +
                `    1. ${existing.sourcePath} (mount: ${existing.mountSpec.path})\n` +
                `    2. ${route.sourcePath} (mount: ${route.mountSpec.path})`);
        }
        routeMap.set(key, route);
    }
}
function mountRoutes(router, routes) {
    for (const route of routes) {
        const { path, method, handlers } = route;
        if (method === "use") {
            router.use(path, ...handlers);
        }
        else if (method === "all") {
            router.all(path, ...handlers);
        }
        else {
            router[method](path, ...handlers);
        }
    }
}
