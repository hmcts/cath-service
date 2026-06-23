import type { ErrorRequestHandler, RequestHandler, Router } from "express";
export declare function createSimpleRouter(...mounts: MountSpec[]): Promise<Router>;
export type Handler = RequestHandler;
export type HandlerExport = Handler | Handler[];
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "del" | "head" | "options" | "trace" | "connect" | "all";
export interface MountSpec {
    path: string;
    prefix?: string;
    trailingSlash?: "off" | "enforce" | "redirect";
}
export interface RouteModule {
    [key: string]: unknown;
    onError?: ErrorRequestHandler;
}
export interface RouteEntry {
    path: string;
    method: string;
    handlers: Handler[];
    sourcePath: string;
    mountSpec: MountSpec;
}
export interface DiscoveredRoute {
    relativePath: string;
    urlPath: string;
    absolutePath: string;
}
//# sourceMappingURL=simple-router.d.ts.map