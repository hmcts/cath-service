import type { Handler, HandlerExport, RouteModule } from "./simple-router.js";
export declare function loadRouteModule(absolutePath: string): Promise<RouteModule>;
export declare function extractHandlers(module: RouteModule): Map<string, HandlerExport>;
export declare function normalizeHandlers(handlerExport: HandlerExport): Handler[];
//# sourceMappingURL=route-loader.d.ts.map