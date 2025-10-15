import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBaseViteConfig } from "@hmcts/web-core/src/assets/vite-config.js";
import { defineConfig, mergeConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseConfig = createBaseViteConfig([path.join(__dirname, "src", "assets")]);

export default defineConfig(
  mergeConfig(baseConfig, {
    plugins: [
      viteStaticCopy({
        targets: [
          {
            // Copy app-specific images
            src: "src/assets/images/**/*",
            dest: "images"
          }
        ]
      })
    ]
  })
);
