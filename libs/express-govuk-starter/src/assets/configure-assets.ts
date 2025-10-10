import path from "node:path";
import type { Express } from "express";
import express from "express";
import type nunjucks from "nunjucks";
import type { AssetOptions } from "./assets.js";
import { createAssetHelpers } from "./assets.js";

/**
 * Configure asset handling for development and production
 */
export async function configureAssets(app: Express, env: nunjucks.Environment, assetConfig: AssetOptions): Promise<void> {
  if (!assetConfig) {
    return;
  }

  const { distPath } = assetConfig;

  app.use("/assets", express.static(path.join(distPath, "assets")));

  // Register asset helpers as Nunjucks globals
  const assetHelpers = createAssetHelpers(distPath);

  for (const [name, value] of Object.entries(assetHelpers)) {
    env.addGlobal(name, value);
  }
}
